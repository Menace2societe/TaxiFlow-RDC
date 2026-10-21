import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createDatabase, migrationFiles } from "./harness";

const migrationsDir = join(__dirname, "..", "..", "supabase", "migrations");

describe("hardening migration on the production schema", () => {
  // La base de production n'avait pas daily_entries.revenue_cdf (ni fuel_cdf,
  // maintenance_cdf…) : la migration doit les créer au lieu d'échouer.
  it("adds missing daily_entries columns and backfills revenue_cdf", async () => {
    const db = await createDatabase();
    const files = migrationFiles();
    const hardening = "20261010120000_security_hardening.sql";
    for (const file of files.filter((name) => name < hardening)) {
      await db.exec(readFileSync(join(migrationsDir, file), "utf8"));
    }

    await db.exec(`
      alter table public.daily_entries
        drop column revenue_cdf, drop column fuel_cdf, drop column maintenance_cdf;
      insert into auth.users (id) values ('00000000-0000-0000-0000-000000000001');
      insert into public.vehicles (id, owner_id, plate_number, status)
        values ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-000000000001', 'KN-9', 'repos');
      insert into public.daily_entries (owner_id, vehicle_id, entry_date, amount, currency, start_km, end_km, declared_amount)
        values ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a1', '2026-10-01', 20, 'USD', 0, 80, 20);
    `);

    await db.exec(readFileSync(join(migrationsDir, hardening), "utf8"));

    const result = await db.query<{ revenue_cdf: string; is_suspicious: boolean }>(
      "select revenue_cdf, is_suspicious from public.daily_entries"
    );
    expect(Number(result.rows[0].revenue_cdf)).toBe(56000);
    expect(result.rows[0].is_suspicious).toBe(false);
  });
});

describe("field operations migration on the production schema", () => {
  // En production : pas de type payment_source (payments.source est du texte) et
  // des véhicules encore en « active » / « inactive ».
  it("accepts mobile_money on a text column and normalizes vehicle statuses", async () => {
    const db = await createDatabase();
    const fieldOperations = "20261011120000_field_operations.sql";
    for (const file of migrationFiles().filter((name) => name < fieldOperations)) {
      await db.exec(readFileSync(join(migrationsDir, file), "utf8"));
    }

    await db.exec(`
      alter table public.payments alter column source drop default;
      alter table public.payments alter column source type text using source::text;
      alter table public.payments alter column source set default 'automated';
      alter table public.payments add constraint payments_source_legacy_check check (source in ('automated', 'manual_backup'));
      drop type public.payment_source;

      alter table public.vehicles drop constraint vehicles_status_check;
      alter table public.vehicles add constraint vehicles_status_check check (status in ('active', 'inactive', 'maintenance'));
      insert into auth.users (id) values ('00000000-0000-0000-0000-000000000001'), ('00000000-0000-0000-0000-000000000002');
      update public.profiles set role = 'driver' where id = '00000000-0000-0000-0000-000000000002';
      insert into public.vehicles (id, owner_id, plate_number, status) values
        ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-000000000001', 'KN-1', 'active'),
        ('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-000000000001', 'KN-2', 'inactive');
    `);

    await db.exec(readFileSync(join(migrationsDir, fieldOperations), "utf8"));
    // Rejouable
    await db.exec(readFileSync(join(migrationsDir, fieldOperations), "utf8"));

    const statuses = await db.query<{ plate_number: string; status: string }>(
      "select plate_number, status from public.vehicles order by plate_number"
    );
    expect(statuses.rows).toEqual([
      { plate_number: "KN-1", status: "en service" },
      { plate_number: "KN-2", status: "repos" }
    ]);

    await expect(
      db.query(
        `insert into public.payments (amount, driver_id, vehicle_id, investor_id, status, source)
         values (1000, '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000a1',
                 '00000000-0000-0000-0000-000000000001', 'validated', 'mobile_money')`
      )
    ).resolves.toBeDefined();

    await expect(
      db.query("update public.vehicles set status = 'active' where plate_number = 'KN-1'")
    ).rejects.toThrow(/vehicles_status_check/);
  });
});

describe("driver_id foreign keys on the production schema", () => {
  // En production, daily_entries.driver_id pointait vers l'ancienne table drivers.
  it("remaps legacy drivers.id to profiles and accepts profile ids again", async () => {
    const db = await createDatabase();
    const fix = "20261021120000_driver_fk_to_profiles.sql";
    for (const file of migrationFiles().filter((name) => name < fix)) {
      await db.exec(readFileSync(join(migrationsDir, file), "utf8"));
    }

    const owner = "00000000-0000-0000-0000-000000000001";
    const driverUser = "00000000-0000-0000-0000-000000000002";
    const legacyDriver = "00000000-0000-0000-0000-0000000000d1";
    const orphanDriver = "00000000-0000-0000-0000-0000000000d2";
    const vehicle = "00000000-0000-0000-0000-0000000000a1";

    await db.exec(`
      insert into auth.users (id, raw_user_meta_data) values
        ('${owner}', '{"role":"investor"}'), ('${driverUser}', '{"role":"driver"}');
      create table public.drivers (id uuid primary key, name text, user_id uuid);
      insert into public.drivers values ('${legacyDriver}', 'Dan', '${driverUser}'), ('${orphanDriver}', 'Sans compte', null);
      alter table public.daily_entries drop constraint if exists daily_entries_driver_id_fkey;
      alter table public.daily_entries add constraint daily_entries_driver_id_fkey
        foreign key (driver_id) references public.drivers (id);
      insert into public.vehicles (id, owner_id, plate_number, status) values ('${vehicle}', '${owner}', 'KN-1', 'repos');
      insert into public.daily_entries (owner_id, vehicle_id, driver_id, entry_date) values
        ('${owner}', '${vehicle}', '${legacyDriver}', '2026-04-20'),
        ('${owner}', '${vehicle}', '${orphanDriver}', '2026-04-21');
    `);

    await db.exec(readFileSync(join(migrationsDir, fix), "utf8"));
    await db.exec(readFileSync(join(migrationsDir, fix), "utf8"));

    const rows = await db.query<{ entry_date: string; driver_id: string | null }>(
      "select entry_date::text, driver_id from public.daily_entries order by entry_date"
    );
    expect(rows.rows).toEqual([
      { entry_date: "2026-04-20", driver_id: driverUser },
      { entry_date: "2026-04-21", driver_id: null }
    ]);

    await expect(
      db.query(
        `insert into public.daily_entries (owner_id, vehicle_id, driver_id, entry_date) values ($1, $2, $3, '2026-10-21')`,
        [owner, vehicle, driverUser]
      )
    ).resolves.toBeDefined();
  });
});
