/**
 * Minimal ambient types for Node's built-in `node:sqlite` module.
 *
 * @types/node in this project (^20) predates node:sqlite's official type
 * definitions. This declares only the small surface the app actually uses
 * (see src/lib/jobs/db.ts) rather than pulling in a newer @types/node.
 */
declare module 'node:sqlite' {
  export interface StatementResultingChanges {
    changes: number | bigint
    lastInsertRowid: number | bigint
  }

  export class StatementSync {
    run(...params: unknown[]): StatementResultingChanges
    get(...params: unknown[]): Record<string, unknown> | undefined
    all(...params: unknown[]): Record<string, unknown>[]
  }

  export interface DatabaseSyncOptions {
    open?: boolean
    readOnly?: boolean
  }

  export class DatabaseSync {
    constructor(location: string, options?: DatabaseSyncOptions)
    close(): void
    exec(sql: string): void
    prepare(sql: string): StatementSync
  }
}
