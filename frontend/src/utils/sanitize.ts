/* eslint-disable no-control-regex */
/**
 * Sanitizes user-provided or API filenames to prevent XSS and rendering issues.
 */
export function sanitizeFileName(name: string): string {
  if (!name) return 'unnamed-file';
  // Strip control characters and path traversal sequences
  return name
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
    .replace(/^\.+/, '')
    .trim()
    .slice(0, 255);
}

/**
 * Returns human-friendly file type categorization
 */
export function getFileTypeCategory(mimeType: string, filename: string): {
  category: 'document' | 'image' | 'video' | 'archive' | 'audio' | 'code' | 'other';
  label: string;
} {
  const mime = mimeType?.toLowerCase() || '';
  const ext = filename?.split('.').pop()?.toLowerCase() || '';

  if (mime.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) {
    return { category: 'image', label: ext.toUpperCase() || 'IMAGE' };
  }
  if (mime.startsWith('video/') || ['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext)) {
    return { category: 'video', label: ext.toUpperCase() || 'VIDEO' };
  }
  if (mime.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'flac', 'm4a'].includes(ext)) {
    return { category: 'audio', label: ext.toUpperCase() || 'AUDIO' };
  }
  if (
    mime.includes('zip') ||
    mime.includes('tar') ||
    mime.includes('gzip') ||
    mime.includes('compressed') ||
    ['zip', 'tar', 'gz', '7z', 'rar'].includes(ext)
  ) {
    return { category: 'archive', label: ext.toUpperCase() || 'ARCHIVE' };
  }
  if (
    mime.includes('pdf') ||
    mime.includes('word') ||
    mime.includes('excel') ||
    mime.includes('text/plain') ||
    ['pdf', 'docx', 'xlsx', 'txt', 'md', 'csv'].includes(ext)
  ) {
    return { category: 'document', label: ext.toUpperCase() || 'DOCUMENT' };
  }
  if (
    ['json', 'ts', 'tsx', 'js', 'jsx', 'html', 'css', 'py', 'java', 'cpp', 'rs', 'go'].includes(ext)
  ) {
    return { category: 'code', label: ext.toUpperCase() || 'CODE' };
  }

  return { category: 'other', label: ext.toUpperCase() || 'FILE' };
}
