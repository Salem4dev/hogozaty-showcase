import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Level 05 — Add exclusion constraint to prevent overlapping reservations
 * for the same provider. Uses tstzrange + GiST via btree_gist extension.
 *
 * Only CONFIRMED and IN_PROGRESS reservations participate in the constraint
 * (drafts and terminal states are excluded) — enforced via a partial index.
 */
export class Level05SlotExclusion1746360000000 implements MigrationInterface {
  name = 'Level05SlotExclusion1746360000000';

  public async up(qr: QueryRunner): Promise<void> {
    // btree_gist is required for combining btree-indexable types (uuid, text)
    // with range types in an exclusion constraint
    await qr.query(`CREATE EXTENSION IF NOT EXISTS btree_gist`);

    // Exclusion constraint: no two reservations for the same provider may
    // overlap in time when both are in active states (confirmed / in_progress).
    // DRAFT reservations are not locked — they become protected on confirmation.
    await qr.query(`
      ALTER TABLE reservations
      ADD CONSTRAINT excl_provider_slot_overlap
        EXCLUDE USING GIST (
          provider_id WITH =,
          tstzrange(slot_start, slot_end) WITH &&
        )
        WHERE (status IN ('confirmed', 'in_progress'))
    `);
  }

  public async down(qr: QueryRunner): Promise<void> {
    await qr.query(`ALTER TABLE reservations DROP CONSTRAINT IF EXISTS excl_provider_slot_overlap`);
  }
}
