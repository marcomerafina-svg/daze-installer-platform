// Workaround for Supabase generated types
// In production, run: npx supabase gen types typescript --project-id <project-id>

export type DbResult<T> = T extends PromiseLike<infer U> ? U : never;
export type DbResultOk<T> = T extends PromiseLike<{ data: infer U }> ? Exclude<U, null> : never;
export type DbResultErr = any;
