import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const defaultClientOrigin =
  process.env.CLIENT_ORIGIN ||
  (process.env.NODE_ENV === 'production' || process.env.VERCEL
    ? 'https://file-not-found-xt4i.vercel.app'
    : 'http://localhost:5180');

const defaultUploadDir = process.env.VERCEL ? '/tmp/uploads' : './uploads';

const envSchema = z.object({
  PORT: z
    .string()
    .default('4000')
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().positive()),
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid URL'),
  CLIENT_ORIGIN: z
    .string()
    .default(defaultClientOrigin),
  UPLOAD_DIR: z.string().default(defaultUploadDir),
  MAX_FILE_SIZE_MB: z
    .string()
    .default('100')
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().positive()),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Configuration validation failed! Invalid environment variables:');
  console.error(JSON.stringify(parsed.error.format(), null, 2));
  process.exit(1);
}

export const config = parsed.data;
export type Config = z.infer<typeof envSchema>;
