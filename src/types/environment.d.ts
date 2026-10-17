declare namespace NodeJS {
  interface ProcessEnv {
    readonly DATABASE_URL?: string;
    readonly POSTGRES_URL?: string;
    readonly POSTGRES_PRISMA_URL?: string;
    readonly POSTGRES_URL_NON_POOLING?: string;
    readonly ADMIN_EMAIL?: string;
    readonly ADMIN_PASSWORD?: string;
    readonly ADMIN_SESSION_SECRET?: string;
  }
}
