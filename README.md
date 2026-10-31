# 🛡️ FileNotFound — Zero-Trust Temporary File Transfer System

[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.0-61dafb?logo=react&logoColor=black)](https://react.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-v20%20%7C%20v24%20LTS-green?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-4.21-lightgrey?logo=express&logoColor=black)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Prisma ORM](https://img.shields.io/badge/Prisma-5.22-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Vitest](https://img.shields.io/badge/Vitest-5.0-FCC72B?logo=vitest&logoColor=black)](https://vitest.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A production-grade, zero-trust temporary file transfer platform built with **React 19, Vite, Node.js, Express, TypeScript, PostgreSQL, and Prisma**. Designed to guarantee strict download limits, hard cryptographic isolation, atomic race-condition defense, and physical data destruction upon expiration or quota exhaustion.

> [!IMPORTANT]
> ### 🌐 Live Production Deployments
> - **Frontend Application:** [https://file-not-found-xt4i.vercel.app](https://file-not-found-xt4i.vercel.app/)
> - **Backend API Gateway:** [https://file-not-found-omega.vercel.app](https://file-not-found-omega.vercel.app/)
> - **Backend Health Check:** [https://file-not-found-omega.vercel.app/api/health](https://file-not-found-omega.vercel.app/api/health)

---

## 📑 Table of Contents
1. [Architectural Overview](#-architectural-overview)
2. [Key Security & Cryptographic Guarantees](#-key-security--cryptographic-guarantees)
3. [End-to-End Cryptographic Workflow](#-end-to-end-cryptographic-workflow)
4. [Database Architecture & Entity Relationships](#-database-architecture--entity-relationships)
5. [Two-Tier Expiration & Self-Destruction Lifecycle](#-two-tier-expiration--self-destruction-lifecycle)
6. [Atomic Concurrency & Race Condition Defense](#-atomic-concurrency--race-condition-defense)
7. [Full-Stack Project Structure](#-full-stack-project-structure)
8. [Quick Start & Local Setup](#-quick-start--local-setup)
9. [API Specification & Endpoints](#-api-specification--endpoints)
10. [Automated Testing & Verification](#-automated-testing--verification)

---

## 🏛️ Architectural Overview

FileNotFound is architected with a decoupled frontend and backend, enforcing defense-in-depth across the network, application, and database layers:

```mermaid
flowchart TD
    subgraph Client ["Client Layer (Browser)"]
        A["Sender (Upload Portal)"]
        B["Receiver (Download Portal)"]
    end

    subgraph Frontend ["Frontend Service (Port 5180)"]
        C["Vite Dev Server & Proxy"]
        D["React 19 UI & Tailwind CSS"]
        E["Axios Client (x-session-token Interceptor)"]
    end

    subgraph Gateway ["Express API Gateway (Port 4000)"]
        F["Helmet (Security Headers)"]
        G["CORS Policy (Origin Isolation)"]
        H["Tiered Rate Limiters (Upload & Brute-Force)"]
        I["Zod Schema Validation (Fail-Fast)"]
    end

    subgraph Backend ["Core Backend Services"]
        J["Share Controller & Service"]
        K["Receiver & Session Controller"]
        L["Atomic Download Controller"]
        M["Cleanup Daemon (node-cron Every 5 Min)"]
    end

    subgraph Storage ["Persistence Layer"]
        N[("PostgreSQL 16 via Prisma")]
        O["Private Disk Storage (UUID Stored Files)"]
    end

    A --> D
    B --> D
    D --> E
    E --> C
    C -->|"/api requests"| F
    F --> G
    G --> H
    H --> I
    I --> J
    I --> K
    I --> L
    J --> N
    J --> O
    K --> N
    L --> N
    L -->|Piped Stream / Dynamic ZIP| B
    M -->|Physical Shredding & Pruning| N
    M -->|fs.unlink| O
```

---

## 🔒 Key Security & Cryptographic Guarantees

| Guarantee | Mechanism | Threat Prevented |
| :--- | :--- | :--- |
| **Zero Raw Token Storage** | Only SHA-256 deterministic hashes (`tokenHash`) are stored in PostgreSQL. Raw 256-bit entropy tokens exist only in client URLs. | **Database breach leakage**: Even a full database dump yields zero usable download links. |
| **Atomic Quota Enforcement** | Single-statement conditional query: `UPDATE "Share" SET "downloadsUsed" = "downloadsUsed" + 1 WHERE "downloadsUsed" < "maxDownloads"`. | **Concurrency race conditions**: Competing simultaneous requests cannot exceed download limits (1, 3, or 10). |
| **Reservation Before Bytes** | The database row-level slot decrement commits *before* streaming any byte to the receiver. | **Network cutoff exploitation**: Disconnecting during a download consumes the attempt and cannot be exploited. |
| **Zero-Knowledge Metadata** | Protected shares return `{ "passwordRequired": true }` with no file names, counts, sizes, or expiration timestamps. | **Metadata eavesdropping**: Unauthorized users learn nothing about shared contents without the passkey. |
| **Two-Tier Expiry** | Synchronous database timestamp check (`expiresAt > NOW()`) on every request + scheduled background file shredder (`node-cron`). | **Expired access windows**: Access is blocked to the exact millisecond, without relying on background timer accuracy. |
| **Path Traversal Elimination** | Files are stored under random UUID filenames outside public web roots and accessed exclusively by database IDs. | **Directory traversal (`../../`)**: Malicious filenames cannot escape storage directories or overwrite system files. |
| **Adaptive Slow Password Hash** | Passwords are salted and hashed using `bcryptjs` with work factor 12 (~250ms per check). | **Dictionary & Rainbow Table attacks**: Brute-force guessing attacks are computationally infeasible. |
| **Timing Attack Mitigation** | Secret comparisons utilize `crypto.timingSafeEqual` with normalized dummy executions. | **Side-channel timing analysis**: Character-by-character response time variances are eliminated. |

---

## ⚡ End-to-End Cryptographic Workflow

```mermaid
sequenceDiagram
    autonumber
    actor Sender as Sender
    participant Client as Frontend (React 19)
    participant API as Backend (Express)
    participant DB as PostgreSQL (Prisma)
    participant Disk as Private Disk Storage
    actor Receiver as Receiver

    Note over Sender,API: Phase 1: Upload & Staging
    Sender->>Client: Select files, TTL (1h), Limit (1), Password
    Client->>API: POST /api/shares (Multipart/form-data)
    API->>API: Generate 32-byte CSPRNG token & UUID filenames
    API->>API: Compute SHA-256(token) & bcrypt(password)
    API->>Disk: Store files under UUIDs
    API->>DB: Save Share (tokenHash, passwordHash, expiresAt)
    API-->>Client: Return raw token in shareLink
    Client-->>Sender: Display share URL

    Note over Receiver,API: Phase 2: Zero-Knowledge Lookup
    Receiver->>Client: Open share link (/s/:token)
    Client->>API: GET /api/shares/:token
    API->>DB: Query WHERE tokenHash = SHA-256(token)
    API-->>Client: Return { passwordRequired: true } (Zero metadata leaked)
    Client-->>Receiver: Render password challenge

    Note over Receiver,API: Phase 3: Authorization & Download
    Receiver->>Client: Submit password
    Client->>API: POST /api/shares/:token/verify
    API->>API: Verify bcrypt(password, passwordHash)
    API->>DB: Insert AccessSession (5-min TTL)
    API-->>Client: Return sessionToken & unlocked metadata + Cookie
    Client-->>Receiver: Display files & download button
    Receiver->>Client: Click "Download File"
    Client->>API: GET /api/shares/:token/files/:id/download (with sessionToken)
    API->>DB: Atomic UPDATE: downloadsUsed = downloadsUsed + 1 WHERE downloadsUsed < maxDownloads
    alt Reservation Succeeded (Updated 1 row)
        API->>Disk: Open read stream for UUID file
        API-->>Receiver: Stream binary bytes directly to browser
    else Quota Exhausted (Updated 0 rows)
        API-->>Receiver: Return 404 / 410 Generic Not Found
    end
```

---

## 🗄️ Database Architecture & Entity Relationships

The data layer is managed with **PostgreSQL 16** and **Prisma ORM**. All child models enforce `onDelete: Cascade` to ensure complete transactional hygiene without orphaned records.

```mermaid
erDiagram
    Share ||--o{ File : "contains (1 to many)"
    Share ||--o{ AccessSession : "authorizes (1 to many)"

    Share {
        string id PK "CUID primary key"
        string tokenHash UK "SHA-256 hash of 32-byte token"
        string passwordHash "Nullable bcrypt work factor 12 hash"
        int maxDownloads "Allowed download slots (1, 3, 10)"
        int downloadsUsed "Atomic reservation counter"
        datetime expiresAt "Hard self-destruct boundary"
        datetime createdAt "Creation timestamp"
        datetime deletedAt "Soft deletion timestamp"
    }

    File {
        string id PK "CUID primary key"
        string shareId FK "Foreign key -> Share.id"
        string originalName "Sanitized human file name"
        string storedName UK "UUID on disk"
        bigint sizeBytes "File size in bytes"
        string mimeType "MIME type header"
        string sha256 "Streaming integrity checksum"
        datetime createdAt "Upload timestamp"
    }

    AccessSession {
        string id PK "CUID primary key"
        string shareId FK "Foreign key -> Share.id"
        string sessionTokenHash UK "SHA-256 hash of session token"
        datetime expiresAt "5-minute session lifetime"
        datetime createdAt "Issuance timestamp"
    }
```

---

## ⏳ Two-Tier Expiration & Self-Destruction Lifecycle

Shares self-destruct through an intentional two-tier process: instant synchronous blocking at request time, coupled with a scheduled background shredder for physical storage reclamation.

```mermaid
stateDiagram-v2
    [*] --> Active: Files Staged & Share Created
    
    state Active {
        [*] --> Accessible
        Accessible --> Accessible: Valid Download (Quota Remaining)
    }

    Active --> ExpiredByTime: Clock passes expiresAt
    Active --> ExhaustedByQuota: downloadsUsed reaches maxDownloads

    state Tier1_InstantGate {
        ExpiredByTime --> Blocked: Synchronous DB Check (expiresAt > NOW())
        ExhaustedByQuota --> Blocked: Atomic Reservation Fails (Count = 0)
        Blocked --> Generic404: Returns 404/410 Uniform Error
    }

    state Tier2_PhysicalCleanup {
        Generic404 --> ScheduledWorker: cron fires (every 5 minutes)
        ScheduledWorker --> DiskUnlink: fs.unlink(UUID files)
        DiskUnlink --> HashWipe: Wipe passwordHash & session rows
        HashWipe --> SoftDelete: Set deletedAt timestamp
    }

    SoftDelete --> [*]: Physical & Cryptographic Destruction Complete
```

---

## 🏎️ Atomic Concurrency & Race Condition Defense

When multiple concurrent requests attempt to download a share with only 1 download remaining, traditional "check-then-update" patterns suffer from **Time-of-Check to Time-of-Use (TOCTOU)** race conditions:

```mermaid
sequenceDiagram
    autonumber
    participant Req1 as Request 1 (Client A)
    participant Req2 as Request 2 (Client B)
    participant PG as PostgreSQL Row Mutex
    participant FS as File Stream

    Note over Req1,Req2: Simultaneous Arrival at t = 0.000s
    Req1->>PG: UPDATE "Share" SET "downloadsUsed" = "downloadsUsed" + 1 WHERE "downloadsUsed" < 1
    Req2->>PG: UPDATE "Share" SET "downloadsUsed" = "downloadsUsed" + 1 WHERE "downloadsUsed" < 1
    
    Note over PG: PostgreSQL row-level lock evaluates queries sequentially
    PG-->>Req1: 1 row affected (Success - Slot Reserved)
    PG-->>Req2: 0 rows affected (Condition Failed: downloadsUsed is now 1)

    Req1->>FS: Pipe file stream to Client A
    FS-->>Req1: File Received (200 OK)

    Req2-->>Req2: Rejected immediately with 404 / 410 Generic Not Found
```

---

## 📁 Full-Stack Project Structure

```text
FileNotFound/
├── LICENSE                        # MIT Open Source License
├── README.md                      # Architecture documentation & visual guides
│
├── frontend/                      # Client Web Application (React 19 + Vite + Tailwind)
│   ├── index.html                 # Single page application entry point
│   ├── vite.config.ts             # Vite configuration with proxy & drive alignment
│   ├── tailwind.config.js         # Editorial design tokens & font configuration
│   ├── package.json               # Client dependencies
│   ├── imgs/                      # Brand assets & logos
│   │   ├── logo.png
│   │   └── logo_no_bg.png
│   └── src/
│       ├── App.tsx                # App root, session provider & routes
│       ├── main.tsx               # DOM bootstrap
│       ├── index.css              # Custom equalizer keyframes, scrollbar & base styles
│       ├── components/
│       │   ├── layout/            # Navbar, Footer, RootLayout
│       │   ├── receiver/          # PasswordChallenge, MetadataCard, DownloadList
│       │   ├── share/             # ShareSuccessCard
│       │   ├── ui/                # BarLoader (Equalizer), Button, Card, InitialLoadingScreen
│       │   └── upload/            # Dropzone, FileStagingList, SecurityPolicyForm
│       ├── context/
│       │   └── SessionContext.tsx # In-memory session state & token management
│       ├── pages/
│       │   ├── UploadPage.tsx     # Drag-and-drop file upload & rule staging portal
│       │   ├── ReceiverPage.tsx   # Recipient challenge, verification & download view
│       │   ├── ShareCreatedPage.tsx # Share link generation view
│       │   ├── PrivacyPage.tsx    # Zero-data retention privacy policy
│       │   ├── TermsPage.tsx      # Terms of service
│       │   └── NotFoundPage.tsx   # Custom 404 view
│       ├── services/
│       │   ├── api.ts             # Axios instance, interceptors & error handlers
│       │   └── shareService.ts    # Live API service functions
│       ├── types/                 # TypeScript interfaces for API contracts
│       └── utils/                 # Formatting & class merging utilities
│
├── backend/                       # Core API Service (Node.js + Express + PostgreSQL)
│   ├── prisma/
│   │   ├── schema.prisma          # Database schema (Share, File, AccessSession)
│   │   └── migrations/            # Declarative SQL migrations
│   ├── uploads/                   # Private disk storage for UUID files (git-ignored)
│   ├── package.json               # Backend dependencies & scripts
│   ├── tsconfig.json              # Strict TypeScript configuration
│   ├── tests/                     # 39 Vitest & Supertest automated test suites
│   │   ├── atomicDownload.test.ts # Concurrency & race condition validation
│   │   ├── cleanupService.test.ts # Physical deletion & background cron tests
│   │   ├── hardening.test.ts      # Helmet headers, rate limiting & error handling
│   │   ├── receiverEndpoints.test.ts # Zero-knowledge metadata & session tests
│   │   ├── securityUtils.test.ts  # Entropy, SHA-256, bcrypt & token unit tests
│   │   └── uploadShare.test.ts    # Multipart upload integration tests
│   └── src/
│       ├── app.ts                 # Decoupled Express app (Helmet, CORS, rate limits)
│       ├── server.ts              # HTTP bootstrap & graceful shutdown handler
│       ├── config/
│       │   ├── db.ts              # Prisma singleton client
│       │   └── env.ts             # Zod environment variable validation
│       ├── controllers/
│       │   ├── downloadController.ts # Single-file & dynamic ZIP streaming
│       │   ├── receiverController.ts # Zero-knowledge lookup & password verification
│       │   └── shareController.ts    # Multipart upload & share creation handler
│       ├── jobs/
│       │   └── cleanupJob.ts      # Scheduled non-overlapping cleanup worker
│       ├── middleware/
│       │   ├── errorHandler.ts    # Centralized error handler (no stack leakage)
│       │   ├── rateLimiter.ts     # IP-based sliding-window rate limiters
│       │   ├── requireSession.ts  # Session token & cookie verification
│       │   ├── resolveShare.ts    # Share lookup with uniform 404 masking
│       │   ├── upload.ts          # Multer disk storage & size restrictions
│       │   └── validation.ts      # Zod request validation schemas
│       ├── services/
│       │   ├── cleanupService.ts  # Disk file unlinking & database sweeping
│       │   ├── metadataService.ts # Server-side metadata sanitizer
│       │   ├── reservationService.ts # Atomic conditional PostgreSQL update
│       │   └── shareService.ts    # Transactional share & file creation
│       └── utils/                 # Token generation, hashing, and sanitization
│
└── mds/                           # Architecture guides and specifications
    ├── BACKENDWORKFLOW.md         # Step-by-step backend build workflow
    ├── INITIAL.md                 # Original system requirements
    ├── SCHEMA_CONVENTIONS.md      # Database modeling standards
    ├── TECHSTACK.md               # Technology selection rationale
    ├── THEORY.md                  # Comprehensive theory guide for beginners
    └── design.md                  # Editorial frontend UI/UX design specification
```

---

## 🚀 Quick Start & Local Setup

### 1. Prerequisites
- **Node.js**: v20.x or v24.x LTS installed
- **PostgreSQL 16**: Running locally (e.g. port 5432) or via Docker

---

### 2. Backend Setup
1. Open a terminal and navigate to the backend directory:
   ```bash
   cd backend
   npm install
   ```

2. Create your `.env` configuration file:
   ```env
   PORT=4000
   DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/filetransfer?schema=public"
   CLIENT_ORIGIN=https://file-not-found-xt4i.vercel.app,http://localhost:5180
   UPLOAD_DIR=./uploads
   MAX_FILE_SIZE_MB=100
   ```
   *(Note: If your database password contains characters like `#` or `@`, URL-encode them: `#` $\rightarrow$ `%23`)*

3. Run the database migrations:
   ```bash
   npx prisma migrate dev
   ```

4. Start the backend development server:
   ```bash
   npm run dev
   ```
   The backend will be live at `http://localhost:4000`.

---

### 3. Frontend Setup
1. Open a second terminal and navigate to the frontend directory:
   ```bash
   cd frontend
   npm install
   ```

2. Verify or create your `frontend/.env` file:
   ```env
   # Leave empty to utilize local Vite dev server proxy (/api -> http://localhost:4000)
   VITE_API_BASE_URL=https://file-not-found-omega.vercel.app

   # Set to false to communicate directly with the live backend
   VITE_USE_MOCK=false
   ```

3. Start the frontend development server:
   ```bash
   npm run dev
   ```
   Open your browser at **[http://localhost:5180](http://localhost:5180)**.

---

## 🔌 API Specification & Endpoints

| Method | Endpoint | Description | Rate Limit |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Service & PostgreSQL connectivity check (`SELECT 1`) | 100 req / 15m |
| `POST` | `/api/shares` | Multi-file upload and rule configuration | 10 req / 15m |
| `GET` | `/api/shares/:token` | Share resolution (returns `{ passwordRequired: true }` if locked) | 100 req / 15m |
| `POST` | `/api/shares/:token/verify` | Password verification & 5-minute session issuance | 5 attempts / 15m |
| `GET` | `/api/shares/:token/metadata` | Protected file metadata (requires session header/cookie) | 100 req / 15m |
| `GET` | `/api/shares/:token/files/:fileId/download` | Atomic single-file download stream | 100 req / 15m |
| `GET` | `/api/shares/:token/download-all` | Atomic dynamic ZIP streaming for all files | 100 req / 15m |

---

## 🧪 Automated Testing & Verification

FileNotFound maintains an automated test suite across all security layers:

```bash
cd backend
npm test
```

```text
 ✓ tests/cleanupService.test.ts (2 tests)
 ✓ tests/securityUtils.test.ts (10 tests)
 ✓ tests/uploadShare.test.ts (8 tests)
 ✓ tests/atomicDownload.test.ts (5 tests)
 ✓ tests/receiverEndpoints.test.ts (10 tests)
 ✓ tests/hardening.test.ts (4 tests)

 Test Files  6 passed (6)
      Tests  39 passed (39)
   Duration  7.33s
```

### Coverage Highlights:
- **Entropy & Tokens**: Validates 256 bits of CSPRNG entropy from `crypto.randomBytes(32)` in base64url format.
- **Race Condition Resistance**: Fires 10 concurrent requests simultaneously against a 1-download limit; exactly 1 succeeds and 9 receive 404/410.
- **Zero Information Disclosure**: Ensures unauthenticated responses for protected shares never contain file counts, file names, sizes, or expiration timestamps.
- **Stream Integrity**: Verifies SHA-256 file checksums match on disk and during download.
- **Physical Cleanup**: Confirms `node-cron` physically deletes files from disk and wipes hashes upon expiration.

---

## 📄 License
This project is licensed under the [MIT License](LICENSE).
