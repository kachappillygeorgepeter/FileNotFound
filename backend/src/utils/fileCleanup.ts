import fs from 'node:fs/promises';

/**
 * Safely removes a list of file paths from disk.
 * Swallows errors (e.g. file already gone) and logs nothing sensitive.
 */
export async function deleteUploadedFiles(filePaths: string[]): Promise<void> {
  await Promise.all(
    filePaths.map(async (filePath) => {
      try {
        await fs.unlink(filePath);
      } catch {
        // Silently ignore if file doesn't exist
      }
    })
  );
}
