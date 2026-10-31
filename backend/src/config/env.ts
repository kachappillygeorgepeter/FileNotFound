import dotenv from 'dotenv';
import { z } from 'zod';
import os from 'node:os';
import path from 'node:path';

dotenv.config();

const isCloudOrServerless = Boolean(
  process.env.VERCEL ||
  process.env.AWS_LAMBDA_FUNCTION_NAME ||
  process.env.LAMBDA_TASK_ROOT ||
  process.env.NODE_ENV === 'production'
);

const defaultClientOrigin =
  process.env.CLIENT_ORIGIN ||
  (isCloudOrServerless
    ? 'https://file-not-found-xt4i.vercel.app'
    : 'http://localhost:5180');

const defaultPublicAppUrl =
  process.env.PUBLIC_APP_URL || 'https://file-not-found-xt4i.vercel.app';

// In serverless/cloud environments, local disk is read-only except /tmp
const defaultUploadDir = isCloudOrServerless
  ? path.join(os.tmpdir(), 'uploads')
  : (process.env.UPLOAD_DIR || './uploads');

const defaultDatabaseUrl =
  process.env.DATABASE_URL ||
  'postgresql://postgres:postgres@localhost:5432/filetransfer?schema=public';

const envSchema = z.object({
  PORT: z
    .string()
    .default('4000')
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().positive()),
  DATABASE_URL: z.string().default(defaultDatabaseUrl),
  CLIENT_ORIGIN: z.string().default(defaultClientOrigin),
  PUBLIC_APP_URL: z.string().default(defaultPublicAppUrl),
  UPLOAD_DIR: z
    .string()
    .default(defaultUploadDir)
    .transform((val) => (isCloudOrServerless ? path.join(os.tmpdir(), 'uploads') : val)),
  MAX_FILE_SIZE_MB: z
    .string()
    .default('100')
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().positive()),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.warn('⚠️ Environment variable validation warning:');
  console.warn(JSON.stringify(parsed.error.format(), null, 2));
}

if (!process.env.DATABASE_URL && process.env.VERCEL) {
  console.warn(
    '⚠️ [Vercel Warning] DATABASE_URL is not set in environment variables! Database operations will fail until a hosted PostgreSQL database (e.g. Neon, Supabase) is connected in Vercel project settings.'
  );
}

export const config = parsed.success
  ? parsed.data
  : {
      PORT: 4000,
      DATABASE_URL: defaultDatabaseUrl,
      CLIENT_ORIGIN: defaultClientOrigin,
      PUBLIC_APP_URL: defaultPublicAppUrl,
      UPLOAD_DIR: defaultUploadDir,
      MAX_FILE_SIZE_MB: 100,
      NODE_ENV: (process.env.NODE_ENV as 'development' | 'production' | 'test') || 'development',
    };

export type Config = z.infer<typeof envSchema>;
