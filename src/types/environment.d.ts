declare namespace NodeJS {
  interface ProcessEnv {
    readonly DATABASE_URL?: string;
    readonly ADMIN_EMAIL?: string;
    readonly ADMIN_PASSWORD?: string;
    readonly ADMIN_SESSION_SECRET?: string;
  }
}
