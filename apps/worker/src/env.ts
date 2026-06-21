export interface Bindings {
  DB: D1Database;
  BOOK_BUCKET: R2Bucket;
  APP_ENV: string;
  FRONTEND_ORIGIN: string;
  BAIDU_CLIENT_ID?: string;
  BAIDU_CLIENT_SECRET?: string;
  BAIDU_REDIRECT_URI?: string;
  JWT_SECRET?: string;
}

export interface Variables {
  userId: string;
}

export type AppEnv = {
  Bindings: Bindings;
  Variables: Variables;
};
