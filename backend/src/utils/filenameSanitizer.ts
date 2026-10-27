import path from 'node:path';

/**
 * Sanitizes original filenames for safe use in HTTP headers (Content-Disposition)
 * and display. Prevents path traversal sequences, control characters, and reserved names.
 */
export function sanitizeFilename(filename: string): string {
  if (!filename || typeof filename !== 'string') {
    return 'downloaded_file';
  }

  // 1. Strip path elements (directory names, slashes)
  let base = path.basename(filename).trim();

  // 2. Strip null bytes and control characters (ASCII 0-31 and 127)
  base = base.replace(/[\x00-\x1F\x7F]/g, '');

  // 3. Remove characters illegal in file systems and HTTP headers (\ / : * ? " < > | `)
  base = base.replace(/[\\/:*?"<>|`]/g, '_');

  // 4. Strip leading dots to prevent hidden file interpretation
  base = base.replace(/^\.+/, '');

  // 5. Enforce reasonable length limit (max 255 chars)
  if (base.length > 255) {
    const ext = path.extname(base);
    const nameWithoutExt = path.basename(base, ext);
    base = nameWithoutExt.slice(0, 255 - ext.length) + ext;
  }

  return base.length > 0 ? base : 'downloaded_file';
}
