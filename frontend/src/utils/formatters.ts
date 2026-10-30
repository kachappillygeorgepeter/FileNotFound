/**
 * Formats byte size into human readable string (KB, MB, GB).
 */
export function formatBytes(bytes: number | string | bigint, decimals = 1): string {
  const num = typeof bytes === 'string' ? Number(bytes) : Number(bytes);
  if (isNaN(num) || num <= 0) return '0 B';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];

  const i = Math.floor(Math.log(num) / Math.log(k));
  const safeIndex = Math.min(i, sizes.length - 1);

  return `${parseFloat((num / Math.pow(k, safeIndex)).toFixed(dm))} ${sizes[safeIndex]}`;
}

/**
 * Formats seconds into HH:MM:SS or MM:SS ticker format.
 */
export function formatTimeRemaining(totalSeconds: number): {
  formatted: string;
  hours: number;
  minutes: number;
  seconds: number;
  isUrgent: boolean;
} {
  const secs = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(secs / 3600);
  const minutes = Math.floor((secs % 3600) / 60);
  const seconds = secs % 60;

  const pad = (n: number) => n.toString().padStart(2, '0');
  const formatted = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;

  return {
    formatted,
    hours,
    minutes,
    seconds,
    isUrgent: secs < 300, // less than 5 minutes remaining
  };
}

/**
 * Formats an ISO date string into a user-friendly timestamp.
 */
export function formatDate(isoString?: string): string {
  if (!isoString) return '—';
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return isoString;

    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
      timeZoneName: 'short',
    }).format(date);
  } catch {
    return isoString;
  }
}

/**
 * Formats transfer speed (bytes per second).
 */
export function formatSpeed(bytesPerSec: number): string {
  if (!bytesPerSec || bytesPerSec <= 0) return '0 KB/s';
  return `${formatBytes(bytesPerSec)}/s`;
}

