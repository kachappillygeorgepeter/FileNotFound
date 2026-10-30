import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';

export const SecurityPage: React.FC = () => {
  return (
    <div className="w-full bg-white select-none">
      {/* Header */}
      <section className="py-24 md:py-32 px-6 md:px-12 max-w-[1600px] mx-auto border-b border-[#E5E5E5] text-left">
        <p className="text-[#111111] text-xs font-bold tracking-[0.4em] mb-4 uppercase">
          Architecture & Guarantees
        </p>
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold text-[#111111] tracking-tight uppercase mb-8">
          SECURITY POLICY
        </h1>
        <p className="text-[#555555] text-base md:text-lg font-medium tracking-wide max-w-2xl leading-relaxed">
          FileNotFound is built around zero-knowledge principles and deterministic access controls.
          Here is how files, tokens, and authorization boundaries are protected.
        </p>
      </section>

      {/* Grid of Security Pillars */}
      <section className="py-20 px-6 md:px-12 max-w-[1600px] mx-auto text-left">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Pillar 1 */}
          <div className="border border-[#E5E5E5] bg-white p-10 md:p-12 space-y-4 shadow-sm hover:shadow-md transition-shadow">
            <span className="block text-4xl font-light text-[#E5E5E5] mb-4">01</span>
            <h3 className="text-xl font-extrabold text-[#111111] uppercase tracking-tight">
              ZERO RAW TOKEN STORAGE
            </h3>
            <p className="text-sm text-[#555555] leading-relaxed">
              Every share creates a 32-byte cryptographic random token (256 bits of entropy) using{' '}
              <code className="text-[#111111] bg-[#F7F7F5] px-1.5 py-0.5 border border-[#E5E5E5] font-mono text-xs">
                crypto.randomBytes
              </code>
              . The raw token is returned only once to the creator and is{' '}
              <strong className="text-[#111111]">never stored in the database or server logs</strong>.
              Only its deterministic SHA-256 hash is recorded. Even in the event of a full database
              leak, an attacker cannot construct working share URLs.
            </p>
          </div>

          {/* Pillar 2 */}
          <div className="border border-[#E5E5E5] bg-white p-10 md:p-12 space-y-4 shadow-sm hover:shadow-md transition-shadow">
            <span className="block text-4xl font-light text-[#E5E5E5] mb-4">02</span>
            <h3 className="text-xl font-extrabold text-[#111111] uppercase tracking-tight">
              CONCURRENCY-SAFE ATOMIC LIMITS
            </h3>
            <p className="text-sm text-[#555555] leading-relaxed">
              Download quotas are enforced via atomic conditional database updates before any byte
              is streamed to the receiver. Competing concurrent requests are gated at the PostgreSQL
              row level:
            </p>
            <div className="p-4 bg-[#F7F7F5] border border-[#E5E5E5] font-mono text-xs text-[#111111] overflow-x-auto">
              <code>
                UPDATE &quot;Share&quot; SET &quot;downloadsUsed&quot; = &quot;downloadsUsed&quot; + 1
                WHERE &quot;downloadsUsed&quot; &lt; &quot;maxDownloads&quot; AND &quot;expiresAt&quot; &gt; NOW()
              </code>
            </div>
            <p className="text-xs text-[#555555]">
              Zero race conditions: limit guarantees cannot be bypassed through high-concurrency burst traffic.
            </p>
          </div>

          {/* Pillar 3 */}
          <div className="border border-[#E5E5E5] bg-white p-10 md:p-12 space-y-4 shadow-sm hover:shadow-md transition-shadow">
            <span className="block text-4xl font-light text-[#E5E5E5] mb-4">03</span>
            <h3 className="text-xl font-extrabold text-[#111111] uppercase tracking-tight">
              ZERO-KNOWLEDGE PASSKEY SHIELDING
            </h3>
            <p className="text-sm text-[#555555] leading-relaxed">
              When passkey protection is enabled, unauthenticated lookup requests receive only{' '}
              <code className="text-[#111111] bg-[#F7F7F5] px-1.5 py-0.5 border border-[#E5E5E5] font-mono text-xs">
                &#123; passwordRequired: true &#125;
              </code>
              . No filenames, counts, sizes, or expiration timestamps are exposed before
              verification. Passkeys are hashed with bcrypt (work factor 12) and verified in
              constant execution time to prevent timing side-channel attacks.
            </p>
          </div>

          {/* Pillar 4 */}
          <div className="border border-[#E5E5E5] bg-white p-10 md:p-12 space-y-4 shadow-sm hover:shadow-md transition-shadow">
            <span className="block text-4xl font-light text-[#E5E5E5] mb-4">04</span>
            <h3 className="text-xl font-extrabold text-[#111111] uppercase tracking-tight">
              HARD EXPIRATION & PHYSICAL DESTRUCTION
            </h3>
            <p className="text-sm text-[#555555] leading-relaxed">
              Expiration is checked synchronously on every request (invalid and expired shares return
              identical generic 404 responses to eliminate oracle enumeration). In addition, an
              independent background worker physically removes on-disk files, purges expired access
              sessions, and sweeps orphaned files every 5 minutes.
            </p>
          </div>
        </div>

        {/* Honest Boundary Notice */}
        <div className="mt-12 p-8 md:p-10 border border-[#E5E5E5] bg-[#F7F7F5] space-y-3">
          <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#111111]">
            CRYPTOGRAPHIC SCOPE & TRANSPARENCY
          </p>
          <p className="text-xs md:text-sm text-[#555555] leading-relaxed">
            FileNotFound provides private object storage, time-limited self-destruction, atomic download
            quotas, and short-lived authorized sessions. Files are encrypted in transit via HTTPS and
            stored in restricted, unindexed private storage with UUID paths. FileNotFound does not make
            unsubstantiated claims of client-side homomorphic encryption or regulatory compliance
            without independent verification.
          </p>
        </div>

        {/* Footer Navigation */}
        <div className="mt-12 pt-8 border-t border-[#E5E5E5] flex justify-between items-center">
          <Link to="/">
            <Button variant="secondary" size="md">
              ← BACK TO UPLOAD
            </Button>
          </Link>
          <Link to="/privacy">
            <Button variant="primary" size="md">
              PRIVACY POLICY →
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
};
