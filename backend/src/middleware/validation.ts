import { z } from 'zod';
import { AllowedExpiryOption, isValidExpiryOption } from '../utils/index.js';

export const allowedExpiryValues: [AllowedExpiryOption, ...AllowedExpiryOption[]] = [
  '10m',
  '1h',
  '24h',
];

export const createShareSchema = z.object({
  expiresIn: z.enum(allowedExpiryValues, {
    errorMap: () => ({ message: 'expiresIn must be one of: 10m, 1h, 24h' }),
  }),
  maxDownloads: z
    .union([z.literal('1'), z.literal('3'), z.literal('10'), z.literal(1), z.literal(3), z.literal(10)])
    .transform((val) => Number(val))
    .refine((val): val is 1 | 3 | 10 => [1, 3, 10].includes(val), {
      message: 'maxDownloads must be 1, 3, or 10',
    }),
  password: z
    .string()
    .trim()
    .min(8, 'Password must be at least 8 characters long')
    .max(128, 'Password must not exceed 128 characters')
    .optional()
    .or(z.literal('').transform(() => undefined)),
});

export type CreateShareInput = z.infer<typeof createShareSchema>;
