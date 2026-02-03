// Workaround for Supabase generated types
// In production, run: npx supabase gen types typescript --project-id <project-id>

export type DbResult<T> = T extends PromiseLike<infer U> ? U : never;
export type DbResultOk<T> = T extends PromiseLike<{ data: infer U }> ? Exclude<U, null> : never;
export type DbResultErr = any;

declare module '@supabase/supabase-js' {
  interface Database {
    public: {
      Tables: {
        installation_companies: {
          Update: {
            onboarding_completed?: boolean;
            onboarding_step?: number;
            onboarding_started_at?: string;
            onboarding_completed_at?: string;
            onboarding_skipped?: boolean;
            [key: string]: any;
          };
          [key: string]: any;
        };
        [key: string]: any;
      };
    };
  }
}
