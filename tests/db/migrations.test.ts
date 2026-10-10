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

  it.each(["20261010120000_security_hardening.sql", "20261010130000_admin_role_management.sql"])(
    "%s can be replayed",
    async (file) => {
      const sql = readFileSync(join(__dirname, "..", "..", "supabase", "migrations", file), "utf8");
      await expect(db.exec(sql)).resolves.toBeDefined();
    }
  );

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

describe("admin role management", () => {
  let admin: string;
  let target: string;

  beforeAll(async () => {
    admin = await createUser(db, { role: "investor", full_name: "Admin" });
    await db.query("update public.profiles set role = 'admin' where id = $1", [admin]);
    target = await createUser(db, { role: "investor", full_name: "Futur admin" });
  });

  const setRole = (caller: string, userId: string, newRole: string) =>
    asUser(db, caller, () => db.query("select public.set_user_role($1, $2)", [userId, newRole]));

  it("an admin can promote and demote another user", async () => {
    await setRole(admin, target, "admin");
    expect((await role(target)).role).toBe("admin");
    await setRole(admin, target, "investor");
    expect((await role(target)).role).toBe("investor");
  });

  it("an admin sees every profile", async () => {
    const visible = await asUser(db, admin, async () => {
      const result = await db.query<{ id: string }>("select id from public.profiles");
      return result.rows.map((row) => row.id);
    });
    expect(visible).toEqual(expect.arrayContaining([driver, strangerDriver, investor, otherInvestor]));
  });

  it("an admin cannot change their own role", async () => {
    await expect(setRole(admin, admin, "investor")).rejects.toThrow(/cannot_change_own_role/);
  });

  it("a non-admin cannot use it", async () => {
    await expect(setRole(investor, investor, "admin")).rejects.toThrow(/not_authorized/);
    await expect(setRole(driver, target, "admin")).rejects.toThrow(/not_authorized/);
  });

  it("rejects unknown roles", async () => {
    await expect(setRole(admin, target, "superuser")).rejects.toThrow(/invalid_role/);
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

describe("field operations", () => {
  let entryId: string;

  beforeAll(async () => {
    entryId = (
      await db.query<{ id: string }>(
        `insert into public.daily_entries (owner_id, vehicle_id, driver_id, entry_date, start_km, end_km, revenue_cdf)
         values ($1, $2, $3, '2026-10-05', 2000, 2090, 3000) returning id`,
        [investor, vehicle, driver]
      )
    ).rows[0].id;
  });

  it("mobile money transactions are read-only for users", async () => {
    await expect(
      asUser(db, driver, () =>
        db.query(
          `insert into public.mobile_money_transactions (id, driver_id, vehicle_id, investor_id, amount, currency, provider, phone, status)
           values (gen_random_uuid(), $1, $2, $3, 1000, 'CDF', 'AIRTEL_COD', '243970000000', 'completed')`,
          [driver, vehicle, investor]
        )
      )
    ).rejects.toThrow(/row-level security/);
  });

  it("mobile money payments are a valid payment source", async () => {
    await expect(
      db.query(
        "insert into public.payments (amount, driver_id, vehicle_id, investor_id, status, source) values (1000, $1, $2, $3, 'validated', 'mobile_money')",
        [driver, vehicle, investor]
      )
    ).resolves.toBeDefined();
  });

  it("only the owner reviews a suspicious entry", async () => {
    await asUser(db, driver, () =>
      db.query("update public.daily_entries set review_status = 'justified' where id = $1", [entryId])
    );
    const afterDriver = await db.query<{ review_status: string | null }>(
      "select review_status from public.daily_entries where id = $1",
      [entryId]
    );
    expect(afterDriver.rows[0].review_status).toBeNull();

    await asUser(db, investor, () =>
      db.query("update public.daily_entries set review_status = 'fraud' where id = $1", [entryId])
    );
    const afterOwner = await db.query<{ review_status: string }>("select review_status from public.daily_entries where id = $1", [entryId]);
    expect(afterOwner.rows[0].review_status).toBe("fraud");
  });

  it("an investor cannot log expenses on someone else's vehicle", async () => {
    await expect(
      asUser(db, otherInvestor, () =>
        db.query(
          "insert into public.vehicle_expenses (owner_id, vehicle_id, expense_date, category, amount_cdf) values ($1, $2, '2026-10-05', 'carburant', 10000)",
          [otherInvestor, vehicle]
        )
      )
    ).rejects.toThrow(/row-level security/);

    await expect(
      asUser(db, investor, () =>
        db.query(
          "insert into public.vehicle_expenses (owner_id, vehicle_id, expense_date, category, amount_cdf) values ($1, $2, '2026-10-05', 'carburant', 10000)",
          [investor, vehicle]
        )
      )
    ).resolves.toBeDefined();
  });

  it("odometer photos: driver uploads in their folder, owner of the entry can read", async () => {
    const path = `${driver}/2026-10-05-x.jpg`;
    await asUser(db, driver, () => db.query("insert into storage.objects (bucket_id, name) values ('odometer-photos', $1)", [path]));
    await db.query("update public.daily_entries set odometer_photo_path = $1 where id = $2", [path, entryId]);

    const canRead = (userId: string) =>
      asUser(db, userId, async () => (await db.query("select 1 from storage.objects where name = $1", [path])).rows.length === 1);
    expect(await canRead(driver)).toBe(true);
    expect(await canRead(investor)).toBe(true);
    expect(await canRead(otherInvestor)).toBe(false);

    await expect(
      asUser(db, strangerDriver, () =>
        db.query("insert into storage.objects (bucket_id, name) values ('odometer-photos', $1)", [`${driver}/fake.jpg`])
      )
    ).rejects.toThrow(/row-level security/);
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
