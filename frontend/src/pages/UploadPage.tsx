import React, { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ExpiryOption, MaxDownloadsOption, UploadProgress } from '../types/share';
import { Dropzone } from '../components/upload/Dropzone';
import { FileStagingList } from '../components/upload/FileStagingList';
import { SecurityPolicyForm } from '../components/upload/SecurityPolicyForm';
import { PolicySummary } from '../components/upload/PolicySummary';
import { UploadProgressModal } from '../components/upload/UploadProgressModal';
import { createShare } from '../services/shareService';

export const UploadPage: React.FC = () => {
  const navigate = useNavigate();

  // Upload Form State
  const [files, setFiles] = useState<File[]>([]);
  const [expiresIn, setExpiresIn] = useState<ExpiryOption>('1h');
  const [maxDownloads, setMaxDownloads] = useState<MaxDownloadsOption>(1);
  const [isPasswordProtected, setIsPasswordProtected] = useState<boolean>(false);
  const [password, setPassword] = useState<string>('');

  // Upload Execution State
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({
    loaded: 0,
    total: 0,
    percentage: 0,
    speedBytesPerSec: 0,
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  const handleFilesSelected = (newFiles: File[]) => {
    setFiles((prev) => [...prev, ...newFiles]);
    setUploadError(null);
  };

  const handleRemoveFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleClearAll = () => {
    setFiles([]);
    setUploadError(null);
  };

  const handleCancelUpload = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsUploading(false);
      setUploadError('Upload cancelled by user.');
    }
  };

  const isFormValid =
    files.length > 0 &&
    (!isPasswordProtected || (password.trim().length >= 8 && password.trim().length <= 128));

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || isUploading) return;

    setIsUploading(true);
    setUploadError(null);
    setUploadProgress({
      loaded: 0,
      total: files.reduce((acc, f) => acc + f.size, 0),
      percentage: 0,
      speedBytesPerSec: 0,
    });

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await createShare(
        {
          files,
          expiresIn,
          maxDownloads,
          password: isPasswordProtected ? password : undefined,
        },
        (prog) => setUploadProgress(prog),
        controller.signal
      );

      setIsUploading(false);
      navigate('/share-created', {
        state: {
          shareData: response,
          passkey: isPasswordProtected ? password : undefined,
        },
      });
    } catch (err: unknown) {
      setIsUploading(false);
      if (err instanceof Error) {
        setUploadError(err.message);
      } else {
        setUploadError('Failed to complete secure upload. Please try again.');
      }
    }
  };

  const scrollToUpload = () => {
    const el = document.getElementById('upload-section');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="w-full min-h-screen bg-white select-none">
      {/* 1. MAIN HERO */}
      <section className="w-full min-h-[85vh] flex flex-col items-center justify-center pt-32 pb-20 px-6 relative bg-white border-b border-[#E5E5E5]">
        <div className="max-w-[1600px] w-full mx-auto flex flex-col items-center text-center">
          <p className="text-[#111111] text-xs font-bold tracking-[0.4em] mb-12 uppercase">
            FileNotFound
          </p>
          <h1 className="text-6xl md:text-7xl lg:text-9xl font-extrabold text-[#111111] tracking-tighter leading-[0.85] mb-10 uppercase">
            YOUR FILES.<br />YOUR RULES.
          </h1>
          <p className="text-[#555555] text-lg md:text-xl font-medium tracking-wide max-w-xl mb-16 leading-relaxed">
            Share files securely with links that expire automatically and access limits you control.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-6 w-full sm:w-auto">
            <button
              type="button"
              onClick={scrollToUpload}
              className="w-full sm:w-auto bg-[#111111] text-white px-10 py-5 text-xs font-bold tracking-[0.2em] uppercase hover:bg-[#333333] transition-colors border border-[#111111] rounded-none"
            >
              SHARE A FILE
            </button>
            <a
              href="#how-it-works"
              className="w-full sm:w-auto bg-white text-[#111111] px-10 py-5 text-xs font-bold tracking-[0.2em] uppercase hover:bg-[#F7F7F5] transition-colors border border-[#E5E5E5] hover:border-[#111111] rounded-none text-center"
            >
              HOW IT WORKS
            </a>
          </div>
        </div>
      </section>

      {/* WHITESPACE SEPARATOR */}
      <div className="w-full h-16 md:h-24 bg-[#F7F7F5]" />

      {/* 2. UPLOAD PORTAL (whereInVIT ItemForm style) */}
      <section id="upload-section" className="py-12 px-6 max-w-[1600px] mx-auto scroll-mt-24">
        <form
          onSubmit={handleUploadSubmit}
          className="max-w-3xl mx-auto bg-white p-10 md:p-14 border border-[#E5E5E5] shadow-sm text-left"
        >
          <p className="text-[#555555] text-xs font-bold tracking-[0.25em] mb-2 uppercase">
            File Staging
          </p>
          <h2 className="text-3xl font-extrabold mb-8 text-[#111111] uppercase tracking-tight">
            Upload & Configure
          </h2>

          {uploadError && (
            <div className="bg-[#111111] text-white p-4 mb-8 text-sm font-semibold tracking-wide flex items-center">
              <span className="mr-3 font-bold uppercase tracking-[0.2em] text-[10px] bg-white text-[#111111] px-2 py-1">
                ERROR
              </span>
              {uploadError}
            </div>
          )}

          <div className="space-y-8">
            {/* Dropzone */}
            <Dropzone
              onFilesSelected={handleFilesSelected}
              currentCount={files.length}
              totalSizeBytes={files.reduce((acc, f) => acc + f.size, 0)}
              disabled={isUploading}
            />

            {/* Staged Files List */}
            <FileStagingList
              files={files}
              onRemoveFile={handleRemoveFile}
              onClearAll={handleClearAll}
            />

            {/* Policy Configuration */}
            {files.length > 0 && (
              <div className="space-y-8 pt-4 border-t border-[#E5E5E5]">
                <SecurityPolicyForm
                  expiresIn={expiresIn}
                  setExpiresIn={setExpiresIn}
                  maxDownloads={maxDownloads}
                  setMaxDownloads={setMaxDownloads}
                  password={password}
                  setPassword={setPassword}
                  isPasswordProtected={isPasswordProtected}
                  setIsPasswordProtected={setIsPasswordProtected}
                  disabled={isUploading}
                />

                <PolicySummary
                  files={files}
                  expiresIn={expiresIn}
                  maxDownloads={maxDownloads}
                  isPasswordProtected={isPasswordProtected}
                />

                {/* Submit Action Button */}
                <div className="flex flex-col-reverse sm:flex-row justify-end gap-4 pt-10 mt-8 border-t border-[#E5E5E5]">
                  <button
                    type="button"
                    onClick={handleClearAll}
                    className="px-8 py-5 bg-[#F7F7F5] text-[#111111] text-[10px] font-bold tracking-[0.2em] uppercase border border-[#E5E5E5] hover:border-[#111111] transition-colors rounded-none"
                    disabled={isUploading}
                  >
                    RESET
                  </button>
                  <button
                    type="submit"
                    disabled={!isFormValid || isUploading}
                    className="px-10 py-5 bg-[#111111] text-white text-[10px] font-bold tracking-[0.2em] uppercase hover:bg-[#333333] transition-colors border border-[#111111] disabled:opacity-50 rounded-none cursor-pointer"
                  >
                    {isUploading ? 'UPLOADING...' : 'UPLOAD SECURELY'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </form>
      </section>

      {/* Upload Progress Modal */}
      <UploadProgressModal
        isOpen={isUploading}
        progress={uploadProgress}
        onCancel={handleCancelUpload}
      />

      {/* 3. HOW IT WORKS SECTION (whereInVIT 4-step matrix) */}
      <section id="how-it-works" className="py-24 md:py-40 bg-white border-y border-[#E5E5E5] scroll-mt-20">
        <div className="max-w-[1600px] mx-auto px-6 md:px-12">
          <p className="text-[#555555] text-xs font-bold tracking-[0.25em] mb-4 uppercase text-center">
            Process
          </p>
          <h2 className="text-3xl md:text-5xl font-extrabold text-[#111111] tracking-tight text-center mb-20 md:mb-32 uppercase">
            HOW FILENOTFOUND WORKS
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-px bg-[#E5E5E5] border border-[#E5E5E5]">
            {[
              {
                num: '01',
                title: 'STAGE & CONFIGURE',
                desc: 'Upload up to 10 files (100 MB max). Set self-destruction timer, atomic download limits, and optional passkeys.',
              },
              {
                num: '02',
                title: 'STREAM PRIVATELY',
                desc: 'Files stream into private storage assigned generated UUID names. Streaming SHA-256 hashes confirm integrity.',
              },
              {
                num: '03',
                title: 'SHIELDED LOOKUP',
                desc: 'Zero metadata is exposed to unauthenticated recipients. Passkeys are challenged in constant time before session release.',
              },
              {
                num: '04',
                title: 'ATOMIC DESTRUCTION',
                desc: 'Downloads are reserved atomically at the database level. Upon limit exhaustion or clock expiry, files are physically wiped.',
              },
            ].map((step) => (
              <div
                key={step.num}
                className="bg-white p-8 md:p-12 hover:bg-[#F7F7F5] transition-colors group text-left"
              >
                <span className="block text-5xl font-light text-[#E5E5E5] group-hover:text-[#111111] transition-colors mb-8 md:mb-12">
                  {step.num}
                </span>
                <h3 className="text-sm md:text-base font-bold tracking-[0.2em] uppercase text-[#111111] mb-4">
                  {step.title}
                </h3>
                <p className="text-[#555555] text-sm md:text-base leading-relaxed">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. SECURITY GUARANTEES SECTION (whereInVIT Campus Coverage pattern) */}
      <section className="py-24 md:py-32 px-6 md:px-12 max-w-[1600px] mx-auto text-left">
        <div className="mb-20">
          <p className="text-[#555555] text-xs font-bold tracking-[0.25em] mb-4 uppercase">
            Guarantees
          </p>
          <h2 className="text-3xl md:text-5xl font-extrabold text-[#111111] tracking-tight uppercase">
            SECURITY ARCHITECTURE
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-y-16 gap-x-12">
          {[
            {
              title: 'ZERO RAW TOKEN PERSISTENCE',
              desc: 'Tokens are never stored in plain text. Only deterministic SHA-256 hashes reside in the database.',
            },
            {
              title: 'CONCURRENCY-SAFE ATOMIC LIMITS',
              desc: 'Single conditional database updates prevent race conditions and enforce exact quotas.',
            },
            {
              title: 'ZERO-INFO PASSKEY SHIELDING',
              desc: 'Metadata is withheld completely until passkey authentication succeeds.',
            },
            {
              title: 'PHYSICAL DATA DESTRUCTION',
              desc: 'Expired files do not linger. A non-overlapping background worker wipes on-disk objects.',
            },
            {
              title: 'CONSTANT-TIME TIMING DEFENSE',
              desc: 'Dummy comparisons ensure passkey check durations do not leak share existence.',
            },
            {
              title: 'SHORT-LIVED AUTHORIZED SESSIONS',
              desc: 'Verified sessions expire in 5 minutes, preventing session hijacking or stale link reuse.',
            },
          ].map((item) => (
            <div key={item.title} className="border-t-2 border-[#111111] pt-6 group cursor-default">
              <h3 className="text-lg md:text-xl font-bold text-[#111111] tracking-tight uppercase mb-2 transition-transform group-hover:translate-x-2">
                {item.title}
              </h3>
              <p className="text-xs text-[#555555] leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 5. CALL TO ACTION SECTION (whereInVIT Night Black #0D0D0D CTA) */}
      <section className="py-32 md:py-48 bg-[#0D0D0D] text-white text-center px-6 border-t border-[#111111]">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-24 md:gap-12">
          <div className="flex-1 text-left">
            <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-6 uppercase">
              SENDING FILES?
            </h2>
            <p className="text-white/60 mb-12 text-lg md:text-xl font-light">
              Stage and share sensitive payloads with automated destruction upon access.
            </p>
            <button
              type="button"
              onClick={scrollToUpload}
              className="inline-block bg-white text-[#111111] px-10 py-5 text-xs font-bold tracking-[0.2em] uppercase hover:bg-[#F7F7F5] hover:scale-105 transition-all rounded-none shadow-[0_0_40px_rgba(255,255,255,0.1)]"
            >
              SHARE A FILE NOW
            </button>
          </div>

          <div className="w-full md:w-px h-px md:h-64 bg-white/20" />

          <div className="flex-1 text-left md:pl-12">
            <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-6 uppercase">
              RECEIVED A LINK?
            </h2>
            <p className="text-white/60 mb-12 text-lg md:text-xl font-light">
              Enter your authorized link and passkey to initiate atomic file retrieval.
            </p>
            <Link
              to="/security"
              className="inline-block bg-white text-[#111111] px-10 py-5 text-xs font-bold tracking-[0.2em] uppercase hover:bg-[#F7F7F5] hover:scale-105 transition-all rounded-none shadow-[0_0_40px_rgba(255,255,255,0.1)]"
            >
              SECURITY DETAILS
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};
