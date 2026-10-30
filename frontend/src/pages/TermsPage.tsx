import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';

export const TermsPage: React.FC = () => {
  return (
    <div className="w-full bg-[#F7F7F5] py-16 px-6 text-left">
      <div className="max-w-3xl mx-auto bg-white p-10 md:p-14 border border-[#E5E5E5] shadow-sm space-y-8">
        <div>
          <p className="text-[#111111] text-xs font-bold tracking-[0.4em] mb-2 uppercase">
            LEGAL DRAFT
          </p>
          <h1 className="text-3xl font-extrabold text-[#111111] uppercase tracking-tight">
            Terms of Service
          </h1>
          <p className="text-xs text-[#555555] tracking-wide mt-1">
            OCTOBER 2026 • VERSION 1.0 (DRAFT SUBJECT TO REVIEW)
          </p>
        </div>

        <div className="bg-[#111111] text-white p-4 text-xs font-semibold tracking-wide flex items-center">
          <span className="mr-3 font-bold uppercase tracking-[0.2em] text-[10px] bg-white text-[#111111] px-2 py-0.5">
            NOTICE
          </span>
          This document is a development draft prepared for project demonstration.
        </div>

        <div className="space-y-6 text-sm text-[#555555] leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-base font-bold text-[#111111] uppercase tracking-wide">
              1. Acceptance of Terms
            </h2>
            <p>
              By accessing or utilizing FileNotFound, you agree to comply with these Terms of Service.
              If you do not agree, do not upload, stage, or download files through the service.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-[#111111] uppercase tracking-wide">
              2. Permitted Use & Prohibited Content
            </h2>
            <p>
              FileNotFound is provided for lawful personal and professional file transfers. You agree
              not to upload, transmit, or share:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-xs">
              <li>Malicious software, exploits, rootkits, or virus binaries.</li>
              <li>Content that infringes third-party intellectual property or copyright.</li>
              <li>Unlawful, harassing, or prohibited material under applicable laws.</li>
              <li>Denial-of-service payloads designed to overwhelm storage or bandwidth.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-[#111111] uppercase tracking-wide">
              3. Self-Destruction & Data Loss Disclaimer
            </h2>
            <p>
              FileNotFound is not a permanent backup service. All files self-destruct upon expiration
              or download quota consumption. Once deleted, file content cannot be recovered under any
              circumstances. You are solely responsible for maintaining backup copies of any files you
              transmit.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-[#111111] uppercase tracking-wide">
              4. Service Availability & Rate Limiting
            </h2>
            <p>
              The service is provided &quot;as is&quot; without warranties of continuous availability. We reserve
              the right to throttle abusive IPs, terminate corrupted transfers, and adjust size limits
              to preserve system integrity.
            </p>
          </section>
        </div>

        <div className="pt-8 border-t border-[#E5E5E5] flex justify-between items-center">
          <Link to="/">
            <Button variant="secondary" size="md">
              ← RETURN HOME
            </Button>
          </Link>
          <Link to="/privacy">
            <Button variant="primary" size="md">
              PRIVACY POLICY →
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};
