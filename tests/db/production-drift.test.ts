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
    for (const file of files.slice(0, -1)) {
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

    await db.exec(readFileSync(join(migrationsDir, files.at(-1)!), "utf8"));

    const result = await db.query<{ revenue_cdf: string; is_suspicious: boolean }>(
      "select revenue_cdf, is_suspicious from public.daily_entries"
    );
    expect(Number(result.rows[0].revenue_cdf)).toBe(56000);
    expect(result.rows[0].is_suspicious).toBe(false);
  });
});
