import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it } from "vitest";
import { applyMigrations, asUser, createDatabase, createUser, migrationFiles } from "./harness";

let db: PGlite;
let investor: string;
let otherInvestor: string;
let driver: string;
let strangerDriver: string;
let ownerDriver: string;
let vehicle: string;
let ownerDriverVehicle: string;

beforeAll(async () => {
  db = await createDatabase();
  await applyMigrations(db);

  investor = await createUser(db, { role: "investor", full_name: "Investisseur A" });
  otherInvestor = await createUser(db, { role: "investor", full_name: "Investisseur B" });
  driver = await createUser(db, { role: "driver", full_name: "Chauffeur A", phone: "+243810000001" });
  strangerDriver = await createUser(db, { role: "driver", full_name: "Chauffeur B", phone: "+243810000002" });
  ownerDriver = await createUser(db, { role: "driver", is_owner_driver: true, full_name: "Patron" });

  vehicle = (
    await db.query<{ id: string }>(
      "insert into public.vehicles (owner_id, driver_id, plate_number, status) values ($1, $2, 'KN-1', 'en service') returning id",
      [investor, driver]
    )
  ).rows[0].id;
  ownerDriverVehicle = (
    await db.query<{ id: string }>(
      "insert into public.vehicles (owner_id, driver_id, plate_number, status) values ($1, $1, 'KN-2', 'en service') returning id",
      [ownerDriver]
    )
  ).rows[0].id;
});

async function role(userId: string) {
  const result = await db.query<{ role: string; is_owner_driver: boolean }>(
    "select role, is_owner_driver from public.profiles where id = $1",
    [userId]
  );
  return result.rows[0];
}

describe("migrations", () => {
  it("apply on an empty database", () => {
    expect(migrationFiles().length).toBeGreaterThan(5);
  });

  it("the hardening migration can be replayed", async () => {
    const last = migrationFiles().at(-1)!;
    const sql = readFileSync(join(__dirname, "..", "..", "supabase", "migrations", last), "utf8");
    await expect(db.exec(sql)).resolves.toBeDefined();
  });

  it("flags entries with many km and a small amount", async () => {
    const result = await db.query<{ distance_covered: string; is_suspicious: boolean }>(
      `insert into public.daily_entries (owner_id, vehicle_id, driver_id, entry_date, start_km, end_km, declared_amount)
       values ($1, $2, $3, '2026-10-01', 1000, 1080, 4000)
       returning distance_covered, is_suspicious`,
      [investor, vehicle, driver]
    );
    expect(Number(result.rows[0].distance_covered)).toBe(80);
    expect(result.rows[0].is_suspicious).toBe(true);
  });

  it("does not flag a USD entry worth more than 5 000 CDF", async () => {
    const result = await db.query<{ is_suspicious: boolean }>(
      `insert into public.daily_entries (owner_id, vehicle_id, driver_id, entry_date, start_km, end_km, declared_amount, amount, currency, revenue_cdf)
       values ($1, $2, $3, '2026-10-02', 1000, 1080, 20, 20, 'USD', 56000)
       returning is_suspicious`,
      [investor, vehicle, driver]
    );
    expect(result.rows[0].is_suspicious).toBe(false);
  });
});

describe("roles are fixed at signup", () => {
  it("public signup cannot create an admin", async () => {
    const id = await createUser(db, { role: "admin" });
    expect((await role(id)).role).toBe("driver");
  });

  it("keeps the owner-driver flag chosen at signup, for drivers only", async () => {
    expect((await role(ownerDriver)).is_owner_driver).toBe(true);
    const investorWithFlag = await createUser(db, { role: "investor", is_owner_driver: true });
    expect((await role(investorWithFlag)).is_owner_driver).toBe(false);
  });

  it("a user cannot change their own role", async () => {
    await expect(
      asUser(db, driver, () => db.query("update public.profiles set role = 'admin' where id = $1", [driver]))
    ).rejects.toThrow(/profile_privileges_locked/);
  });

  it("a driver cannot make themself owner-driver", async () => {
    await expect(
      asUser(db, driver, () => db.query("update public.profiles set is_owner_driver = true where id = $1", [driver]))
    ).rejects.toThrow(/profile_privileges_locked/);
  });

  it("a user can still edit their name", async () => {
    await asUser(db, driver, () => db.query("update public.profiles set full_name = 'Chauffeur A.' where id = $1", [driver]));
    const result = await db.query<{ full_name: string }>("select full_name from public.profiles where id = $1", [driver]);
    expect(result.rows[0].full_name).toBe("Chauffeur A.");
  });

  it("the SQL editor can still promote an admin", async () => {
    const id = await createUser(db, { role: "investor" });
    await db.query("update public.profiles set role = 'admin' where id = $1", [id]);
    expect((await role(id)).role).toBe("admin");
  });
});

describe("profile privacy", () => {
  async function visibleProfiles(userId: string) {
    return asUser(db, userId, async () => {
      const result = await db.query<{ id: string }>("select id from public.profiles");
      return result.rows.map((row) => row.id);
    });
  }

  it("an investor sees their own drivers but not other drivers", async () => {
    const visible = await visibleProfiles(investor);
    expect(visible).toContain(driver);
    expect(visible).not.toContain(strangerDriver);
  });

  it("another investor does not see that driver", async () => {
    expect(await visibleProfiles(otherInvestor)).not.toContain(driver);
  });

  it("a driver sees the owner of their vehicle", async () => {
    expect(await visibleProfiles(driver)).toContain(investor);
  });

  it("phone lookup works for investors and is refused to plain drivers", async () => {
    const found = await asUser(db, otherInvestor, () =>
      db.query<{ id: string }>("select id from public.find_driver_by_phone('+243 810 000 002')")
    );
    expect(found.rows[0].id).toBe(strangerDriver);

    await expect(
      asUser(db, driver, () => db.query("select * from public.find_driver_by_phone('+243810000002')"))
    ).rejects.toThrow(/not_authorized/);
  });
});

describe("payments", () => {
  const insertPayment = (driverId: string, vehicleId: string, investorId: string, status: string) =>
    db.query(
      "insert into public.payments (amount, driver_id, vehicle_id, investor_id, status) values (10000, $1, $2, $3, $4::public.payment_status)",
      [driverId, vehicleId, investorId, status]
    );

  it("a driver can declare a pending payment", async () => {
    await expect(asUser(db, driver, () => insertPayment(driver, vehicle, investor, "pending"))).resolves.toBeDefined();
  });

  it("a driver cannot self-approve a payment", async () => {
    await expect(asUser(db, driver, () => insertPayment(driver, vehicle, investor, "validated"))).rejects.toThrow(
      /row-level security/
    );
  });

  it("an owner-driver can validate payments on their own vehicle", async () => {
    await expect(
      asUser(db, ownerDriver, () => insertPayment(ownerDriver, ownerDriverVehicle, ownerDriver, "validated"))
    ).resolves.toBeDefined();
  });
});

describe("vehicle assignment", () => {
  it("refuses to assign an investor as driver", async () => {
    await expect(
      asUser(db, investor, () =>
        db.query("update public.vehicles set driver_id = $1 where id = $2", [otherInvestor, vehicle])
      )
    ).rejects.toThrow(/driver_role_required/);
  });
});

describe("legal documents storage", () => {
  const path = () => `${investor}/${driver}/${vehicle}/1-assurance.pdf`;

  beforeAll(async () => {
    await asUser(db, investor, async () => {
      await db.query("insert into storage.objects (bucket_id, name) values ('documents', $1)", [path()]);
      await db.query(
        `insert into public.legal_documents (owner_id, driver_id, vehicle_id, document_type, document_name, file_url, storage_path)
         values ($1, $2, $3, 'assurance', 'Assurance', '', $4)`,
        [investor, driver, vehicle, path()]
      );
    });
  });

  const canRead = (userId: string) =>
    asUser(db, userId, async () => {
      const result = await db.query("select 1 from storage.objects where name = $1", [path()]);
      return result.rows.length === 1;
    });

  it("the bucket is private", async () => {
    const result = await db.query<{ public: boolean }>("select public from storage.buckets where id = 'documents'");
    expect(result.rows[0].public).toBe(false);
  });

  it("the owner and the driver can read the file, nobody else", async () => {
    expect(await canRead(investor)).toBe(true);
    expect(await canRead(driver)).toBe(true);
    expect(await canRead(otherInvestor)).toBe(false);
    expect(await canRead(strangerDriver)).toBe(false);
  });

  it("nobody can upload into someone else's folder", async () => {
    await expect(
      asUser(db, otherInvestor, () =>
        db.query("insert into storage.objects (bucket_id, name) values ('documents', $1)", [`${investor}/x/y/z.pdf`])
      )
    ).rejects.toThrow(/row-level security/);
  });
});
