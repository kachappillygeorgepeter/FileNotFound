import fs from 'node:fs';
import crypto from 'node:crypto';
import { Readable } from 'node:stream';

/**
 * Computes the SHA-256 hash of a file or stream in a streaming manner.
 * Ensures large files do not exhaust memory buffers.
 */
export async function computeFileHash(source: string | Readable): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = typeof source === 'string' ? fs.createReadStream(source) : source;

    stream.on('data', (chunk: Buffer | string) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', (err: Error) => reject(err));
  });
}
