import {
  MigrationInterface,
  QueryRunner,
} from 'typeorm';


/**
 * Adds indexes for the most common list / sort / cleanup queries.
 *
 * - tasks(created_at)            default sort of every task list (ORDER BY created_at DESC)
 * - tasks(status, assigned_to_id) "my tasks by status" and dashboard counters
 * - tasks(archived_at)           archive view and "not archived" filters
 * - audit_logs(created_at)       audit-log page, newest first (table only ever grows)
 * - refresh_tokens(expires_at)   expired-token cleanup / validity lookups
 *
 * MySQL has no CREATE INDEX IF NOT EXISTS, so each statement is guarded
 * by a lookup in information_schema, making this migration safe to re-run.
 * Indexes are plain B-trees on existing columns; building them on a large
 * table takes a short metadata lock, so run during a quiet period.
 */
const INDEXES: ReadonlyArray<{
  table: string;
  name: string;
  columns: string;
}> = [
  { table: 'tasks', name: 'idx_tasks_created_at', columns: 'created_at' },
  { table: 'tasks', name: 'idx_tasks_status_assignee', columns: 'status, assigned_to_id' },
  { table: 'tasks', name: 'idx_tasks_archived_at', columns: 'archived_at' },
  { table: 'audit_logs', name: 'idx_audit_created_at', columns: 'created_at' },
  { table: 'refresh_tokens', name: 'idx_refresh_tokens_expires', columns: 'expires_at' },
];


async function indexExists(
  queryRunner: QueryRunner,
  table: string,
  name: string,
): Promise<boolean> {
  const rows = await queryRunner.query(
    `
      SELECT 1
      FROM information_schema.statistics
      WHERE table_schema = DATABASE()
        AND table_name = ?
        AND index_name = ?
      LIMIT 1
    `,
    [table, name],
  );

  return rows.length > 0;
}


export class AddPerformanceIndexes1724015000000
  implements MigrationInterface {
  name =
    'AddPerformanceIndexes1724015000000';


  public async up(
    queryRunner: QueryRunner,
  ): Promise<void> {
    for (const index of INDEXES) {
      if (await indexExists(queryRunner, index.table, index.name)) continue;

      await queryRunner.query(
        `CREATE INDEX ${index.name} ON ${index.table} (${index.columns})`,
      );
    }
  }


  public async down(
    queryRunner: QueryRunner,
  ): Promise<void> {
    for (const index of [...INDEXES].reverse()) {
      if (!(await indexExists(queryRunner, index.table, index.name))) continue;

      await queryRunner.query(
        `DROP INDEX ${index.name} ON ${index.table}`,
      );
    }
  }
}
