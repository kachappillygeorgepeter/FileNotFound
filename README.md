# FileNotFound — Zero-Trust Temporary File Transfer System

A high-security, zero-trust temporary file transfer service built with **Node.js, Express, TypeScript, PostgreSQL, and Prisma**. Designed to guarantee strict download limits, hard cryptographic isolation, and physical data destruction upon expiration or exhaustion.

---

## Key Security & Architectural Guarantees

1. **Zero Raw Token Storage**:
   - Share URLs contain a 32-byte (256-bit entropy) URL-safe random token.
   - Raw tokens are **never** stored in the database or logs; only deterministic SHA-256 hashes (`tokenHash`) are stored and queried. A database breach never leaks functional links.
2. **Atomic Download Limits (No Race Conditions)**:
   - Download slot reservations are executed via a single atomic conditional PostgreSQL query (`UPDATE "Share" SET "downloadsUsed" = "downloadsUsed" + 1 WHERE ...`).
   - Competing concurrent requests are gated at the database row level; download limits (1, 3, or 10) can **never** be exceeded, even under high concurrency.
3. **Reservation Before Bytes**:
   - Download slots are reserved and committed in the database *before* streaming a single byte to the receiver.
4. **Zero-Knowledge Password Verification**:
   - Password-protected shares reveal **zero metadata** (no file names, file counts, sizes, or expiration timestamps) until the correct password is provided.
   - Password verification issues a short-lived (5-minute) access session, storing only its SHA-256 hash in PostgreSQL.
5. **Request-Time & Background Expiration**:
   - Expiration and download limits are verified synchronously on every request (invalid/exhausted shares return identical generic `404` errors).
   - An independent background worker (`node-cron`) physically deletes on-disk files, clears password hashes, purges expired access sessions, and removes disk orphans every 5 minutes.
6. **Path Traversal Elimination**:
   - Uploaded files are assigned random UUID stored names with no relationship to original filenames.
   - Files are stored in a private directory outside web roots and streamed only through database record lookups.
7. **Structured Zero-Leakage Logging**:
   - Automated log sanitizer recursively redacts tokens, passwords, session tokens, and file paths.

---

## Tech Stack

- **Runtime**: Node.js (v20+ / v24+ LTS)
- **Language**: TypeScript 5.8+ (Strict mode, ES Modules)
- **Web Framework**: Express.js
- **Database**: PostgreSQL 16
- **ORM & Migrations**: Prisma ORM 5.22
- **File Uploads**: Multer (disk storage, UUID naming)
- **Streaming Archives**: Archiver (dynamic ZIP compression)
- **Validation**: Zod (fail-fast environment and request validation)
- **Security & Headers**: Helmet, CORS, Cookie-Parser
- **Rate Limiting**: express-rate-limit
- **Cryptography & Hashing**: Node `crypto`, `bcryptjs` (work factor 12)
- **Scheduling**: `node-cron` (non-overlapping worker)
- **Testing**: Vitest, Supertest

---

## Project Structure

```text
FileNotFound/
├── .git/                      # Git repository tracking
├── LICENSE                    # MIT License
├── README.md                  # Comprehensive project documentation & architecture guide
│
├── backend/                   # Zero-trust temporary file transfer backend service
│   ├── prisma/
│   │   ├── migrations/        # Declarative PostgreSQL schema migrations
│   │   └── schema.prisma      # Prisma schema (Share, File, AccessSession models)
│   ├── src/
│   │   ├── config/
│   │   │   ├── db.ts          # Singleton Prisma client instance
│   │   │   └── env.ts         # Zod fail-fast environment validation
│   │   ├── controllers/
│   │   │   ├── downloadController.ts # Atomic single-file & streaming ZIP downloads
│   │   │   ├── receiverController.ts # Share metadata lookup & password verification
│   │   │   └── shareController.ts    # Multipart upload handler & share creation
│   │   ├── jobs/
│   │   │   └── cleanupJob.ts  # Non-overlapping scheduled cleanup worker (cron)
│   │   ├── middleware/
│   │   │   ├── errorHandler.ts       # Centralized error handler (no trace leakage)
│   │   │   ├── rateLimiter.ts         # Tiered IP/token rate-limiters
│   │   │   ├── requireSession.ts      # Session validation for protected shares
│   │   │   ├── resolveShare.ts        # Share lookup & uniform 404 response
│   │   │   ├── upload.ts              # Multer configuration (size/count enforcement)
│   │   │   └── validation.ts          # Zod request body validation schemas
│   │   ├── routes/
│   │   │   ├── health.ts      # GET /api/health (DB and server status)
│   │   │   └── share.ts       # Complete share creation, receiver, and download router
│   │   ├── services/
│   │   │   ├── cleanupService.ts      # Physical disk deletion, wipe & orphan sweep
│   │   │   ├── metadataService.ts     # Metadata calculation & sanitization
│   │   │   ├── reservationService.ts  # Atomic PostgreSQL row-level reservation
│   │   │   └── shareService.ts        # Share creation & file hashing transactions
│   │   ├── utils/
│   │   │   ├── expiryParser.ts        # Expiration interval validator (10m, 1h, 24h)
│   │   │   ├── fileCleanup.ts         # Async file removal helper
│   │   │   ├── fileHash.ts            # Streaming SHA-256 file checksums
│   │   │   ├── filenameSanitizer.ts   # RFC-compliant filename sanitization
│   │   │   ├── logger.ts              # Structured JSON logger with auto-redaction
│   │   │   ├── password.ts            # bcryptjs hash and compare (work factor 12)
│   │   │   ├── safeCompare.ts         # crypto.timingSafeEqual wrapper
│   │   │   ├── session.ts             # Session token generator & hash verifier
│   │   │   ├── storedFilename.ts      # UUID stored filename generator
│   │   │   ├── token.ts               # 32-byte URL-safe base64 token generator & hasher
│   │   │   └── index.ts               # Barrel export for utility functions
│   │   ├── app.ts             # Decoupled Express app (no port binding, test-ready)
│   │   └── server.ts          # Server bootstrap & graceful shutdown handler
│   ├── tests/
│   │   ├── atomicDownload.test.ts     # Concurrency & download limit tests
│   │   ├── cleanupService.test.ts     # Physical deletion & orphan sweep tests
│   │   ├── hardening.test.ts          # Security headers, rate limiting & error handling
│   │   ├── receiverEndpoints.test.ts  # Lookup & password verification tests
│   │   ├── securityUtils.test.ts      # Unit tests for cryptographic helpers
│   │   └── uploadShare.test.ts        # Integration tests for upload endpoints
│   ├── uploads/               # Private local disk storage (git-ignored)
│   ├── .env.example           # Template for environment variables
│   ├── eslint.config.js       # ESLint configuration
│   ├── package.json           # Backend scripts and dependencies
│   ├── REQUIREMENTS.md        # Detailed backend dependency specification
│   └── tsconfig.json          # Strict TypeScript configuration
│
├── frontend/                  # Web application client portal
│   └── imgs/                  # Brand and visual UI assets
│       ├── logo.png           # FileNotFound brand logo
│       └── logo_no_bg.png     # Transparent brand logo asset
│
└── mds/                       # Architectural specifications & system workflows
    ├── BACKENDWORKFLOW.md     # Phase-by-phase backend implementation guide
    ├── INITIAL.md             # Initial project goals, requirements & specifications
    ├── SCHEMA_CONVENTIONS.md  # Database models, field naming & SQL conventions
    ├── TECHSTACK.md           # Full-stack architectural tech stack guide
    └── design.md              # Frontend UI/UX design system specification
```

---

## Getting Started

### 1. Prerequisites
- **Node.js**: v20.x or v24.x LTS installed
- **PostgreSQL**: Running locally or via Docker

### 2. Installation
```bash
cd backend
npm install
```

### 3. Environment Configuration
Create a `.env` file in `backend/` by copying `.env.example`:

```bash
cp .env.example .env
```

Edit `.env` with your PostgreSQL credentials:
```env
PORT=4000
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/filetransfer?schema=public"
CLIENT_ORIGIN=http://localhost:5173
UPLOAD_DIR=./uploads
MAX_FILE_SIZE_MB=100
```
*(Note: If your password contains special characters like `#` or `@`, ensure they are URL-encoded, e.g. `#` → `%23`)*

### 4. Database Setup & Migrations
Create the database and apply the Prisma migrations:
```bash
npx prisma migrate dev
```

### 5. Running the Application

- **Development Mode** (auto-restart with `tsx watch`):
  ```bash
  npm run dev
  ```
- **Build Production Bundle**:
  ```bash
  npm run build
  ```
- **Start Production Server**:
  ```bash
  npm run start
  ```

---

## API Endpoints Reference

### 1. Health Check
- `GET /api/health`
  - Validates server state and active database connectivity (`SELECT 1`).
  - Response: `{ "status": "ok", "services": { "database": "connected", "server": "running" } }`

### 2. Upload & Share Creation
- `POST /api/shares`
  - Multipart form data:
    - `files`: 1 to 10 files (max 100 MB per file, combined cap 200 MB).
    - `expiresIn`: `'10m'` | `'1h'` | `'24h'`.
    - `maxDownloads`: `1` | `3` | `10`.
    - `password`: *(Optional)* Minimum 8 characters.
  - Rate limit: 10 uploads per 15 minutes per IP.
  - Response (201 Created):
    ```json
    {
      "shareLink": "http://localhost:5173/s/17_token_xyz...",
      "expiresAt": "2026-10-28T01:05:00.000Z",
      "maxDownloads": 3,
      "fileCount": 2
    }
    ```

### 3. Receiver Endpoints
- `GET /api/shares/:token`
  - **Password Protected Share**: Returns `{ "passwordRequired": true }` (no files or counts revealed).
  - **Public Share**: Returns full metadata (`files`, `timeRemainingSeconds`, `downloadsRemaining`).
- `POST /api/shares/:token/verify`
  - Body: `{ "password": "userPassword" }`.
  - Rate limit: Strict 5 attempts per 15 minutes per `IP:token`.
  - Response: Unlocks metadata and issues an `access_session_token` cookie and JSON `sessionToken` valid for 5 minutes.
- `GET /api/shares/:token/metadata`
  - Requires `x-session-token` header or session cookie for password-protected shares.

### 4. Atomic Download Endpoints
- `GET /api/shares/:token/files/:fileId/download`
  - Reserves download slot atomically via PostgreSQL.
  - Streams single file with `Content-Disposition: attachment`, sanitized name, and `X-Content-Type-Options: nosniff`.
- `GET /api/shares/:token/download-all`
  - Reserves single download slot for entire archive.
  - Dynamically streams multi-file compressed ZIP without buffering in server memory.

---

## Testing & Quality Assurance

The codebase includes an automated test suite implemented in **Vitest** and **Supertest** covering all phases:

| Test Suite | File | Coverage |
|---|---|---|
| **Unit Tests** | `tests/securityUtils.test.ts` | Token entropy, SHA-256 hashes, bcrypt, UUID filenames, stream hashes, filename sanitizer, expiry parser. |
| **Upload API** | `tests/uploadShare.test.ts` | Multi-file upload, zero-byte rejection, 100MB limit, option validation, rollback on error. |
| **Receiver API** | `tests/receiverEndpoints.test.ts` | Zero information leakage before password, uniform 404s, session generation, metadata access. |
| **Concurrency** | `tests/atomicDownload.test.ts` | 10 parallel download requests competing for 1 download slot, ZIP streaming, foreign file rejection. |
| **Hardening** | `tests/hardening.test.ts` | Helmet headers, rate limiting (429 on brute force), body limits, error sanitizer. |
| **Cleanup** | `tests/cleanupService.test.ts` | Physical disk deletion, audit soft-delete, password wiping, session purging, disk orphan sweep. |

### Run the Test Suite:
```bash
npm test
```
*(All 39 tests pass cleanly against the local PostgreSQL test instance)*

---

## License
MIT License.
