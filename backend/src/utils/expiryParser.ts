export type AllowedExpiryOption = '10m' | '1h' | '24h';

const EXPIRY_DURATIONS_MS: Record<AllowedExpiryOption, number> = {
  '10m': 10 * 60 * 1000,
  '1h': 60 * 60 * 1000,
  '24h': 24 * 60 * 60 * 1000,
};

/**
 * Converts valid expiry strings ('10m', '1h', '24h') into a calculated future Date.
 * Rejects any unsupported options with a clear error.
 */
export function parseExpiryOption(option: string, fromDate: Date = new Date()): Date {
  const duration = EXPIRY_DURATIONS_MS[option as AllowedExpiryOption];

  if (!duration) {
    throw new Error(
      `Invalid expiry option "${option}". Allowed values are: ${Object.keys(EXPIRY_DURATIONS_MS).join(', ')}`
    );
  }

  return new Date(fromDate.getTime() + duration);
}

/**
 * Type guard for AllowedExpiryOption
 */
export function isValidExpiryOption(val: unknown): val is AllowedExpiryOption {
  return typeof val === 'string' && val in EXPIRY_DURATIONS_MS;
}
