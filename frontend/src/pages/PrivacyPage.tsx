import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';

export const PrivacyPage: React.FC = () => {
  return (
    <div className="w-full bg-[#F7F7F5] py-16 px-6 text-left">
      <div className="max-w-3xl mx-auto bg-white p-10 md:p-14 border border-[#E5E5E5] shadow-sm space-y-8">
        <div>
          <p className="text-[#111111] text-xs font-bold tracking-[0.4em] mb-2 uppercase">
            LEGAL DRAFT
          </p>
          <h1 className="text-3xl font-extrabold text-[#111111] uppercase tracking-tight">
            Privacy Policy
          </h1>
          <p className="text-xs text-[#555555] tracking-wide mt-1">
            OCTOBER 2026 • VERSION 1.0 (DRAFT SUBJECT TO REVIEW)
          </p>
        </div>

        <div className="bg-[#111111] text-white p-4 text-xs font-semibold tracking-wide flex items-center">
          <span className="mr-3 font-bold uppercase tracking-[0.2em] text-[10px] bg-white text-[#111111] px-2 py-0.5">
            NOTICE
          </span>
          This privacy policy is a development draft prepared for project demonstration.
        </div>

        <div className="space-y-6 text-sm text-[#555555] leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-base font-bold text-[#111111] uppercase tracking-wide">
              1. Zero-Retention Philosophy
            </h2>
            <p>
              FileNotFound is engineered from the ground up to minimize data collection and eliminate
              long-term file retention. We do not require accounts, user profiles, tracking cookies,
              or telemetry trackers to upload or download files.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-[#111111] uppercase tracking-wide">
              2. Ephemeral Storage & Automatic Deletion
            </h2>
            <p>
              Files uploaded to FileNotFound are stored strictly for the sender-designated lifetime
              (10 minutes, 1 hour, or 24 hours) or until the configured download quota is consumed.
              Once either condition is satisfied:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-xs">
              <li>Physical file data is unlinked and deleted from storage.</li>
              <li>Access sessions and database records are purged.</li>
              <li>Subsequent requests to the share token receive generic 404 responses.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-[#111111] uppercase tracking-wide">
              3. Zero Raw Token Persistence
            </h2>
            <p>
              Share tokens generated in URLs are never logged or stored in our database. We store only
              a SHA-256 hash of the token. In the event of an infrastructure compromise, database
              records cannot be reversed into accessible file download URLs.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-[#111111] uppercase tracking-wide">
              4. Server Logs & Diagnostics
            </h2>
            <p>
              Internal server logs record standard operational diagnostics (timestamp, response status,
              and IP-based rate limiting counts). Our logging layer automatically redacts share tokens,
              passkeys, session identifiers, and file paths.
            </p>
          </section>
        </div>

        <div className="pt-8 border-t border-[#E5E5E5] flex justify-between items-center">
          <Link to="/">
            <Button variant="secondary" size="md">
              ← RETURN HOME
            </Button>
          </Link>
          <Link to="/terms">
            <Button variant="primary" size="md">
              TERMS OF SERVICE →
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};
