# Detailed Tech Stack: Zero-Trust Temporary File Transfer System

Every tool listed here is free and open source, and was chosen to be beginner friendly. Package versions are intentionally not pinned in this document; install the latest stable versions and let `package.json` lock them.

---

## 1. Stack at a Glance

| Layer | Choice | Role |
|---|---|---|
| Language | TypeScript (frontend and backend) | Type safety across the whole project |
| Runtime | Node.js (current LTS) | Runs the backend and the build tools |
| Frontend framework | React 19 + Vite | User interface and fast dev server |
| Styling | Tailwind CSS + Lucide React | Responsive UI and icons |
| Server state | TanStack Query + Axios | API calls, caching, upload progress |
| Backend framework | Express.js | REST API |
| Database | PostgreSQL | Metadata, access rules, expiry data |
| ORM | Prisma | Type-safe database access and migrations |
| Cryptography | Node.js `crypto` | Share tokens and file hashes |
| Password hashing | bcryptjs | Optional share passwords |
| File uploads | Multer | Multipart parsing and disk storage |
| Validation | Zod | Request and environment validation |
| Rate limiting | express-rate-limit | Abuse protection |
| Security headers | Helmet, CORS | HTTP hardening |
| Background jobs | node-cron | Cleanup worker |
| File storage | Local filesystem (private folder) | Uploaded files |
| Cloud (optional) | AWS S3, CloudFront, EC2/App Runner, SSM | Production deployment |

---

## 2. Frontend

### 2.1 React 19 + Vite + TypeScript
- **What it does:** React renders the sender and receiver pages. Vite is the build tool and dev server. TypeScript adds types.
- **Why this choice:** Vite starts instantly and has hot reload, and the React ecosystem has the most tutorials, which helps beginners.
- **Create the project:**
  ```bash
  npm create vite@latest client -- --template react-ts
  ```
- **Pages needed:**
  - `/` for the sender upload portal
  - `/s/:token` for the receiver download portal
  - A simple "link expired or not found" state

### 2.2 Tailwind CSS
- **What it does:** Utility-first CSS for styling directly in JSX.
- **Why this choice:** No separate CSS files to manage, and responsive design is built in with prefixes such as `md:` and `lg:`.
- **Used for:** The drag-and-drop zone, progress bar, form controls, cards, and mobile layout.

### 2.3 Lucide React
- **What it does:** A set of clean SVG icons as React components.
- **Used for:** Upload, file, lock, clock, download, copy, and check icons.
- **Install:** `npm install lucide-react`

### 2.4 TanStack Query (React Query)
- **What it does:** Manages server state, including loading, error, and retry behavior.
- **Why this choice:** It removes a lot of manual `useEffect` and `useState` code for API calls.
- **How it is used here:**
  - `useMutation` for creating a share and verifying a password
  - `useQuery` for loading share metadata after verification
- **Install:** `npm install @tanstack/react-query`

### 2.5 Axios
- **What it does:** HTTP client with built-in upload progress events.
- **Why this choice:** The browser `fetch` API cannot report upload progress easily, while Axios exposes `onUploadProgress`.
- **Install:** `npm install axios`

### 2.6 Optional frontend helpers
| Package | Purpose |
|---|---|
| `react-router-dom` | Routing between sender and receiver pages |
| `react-dropzone` | Drag-and-drop file selection with size and type checks |
| `react-hook-form` + `zod` | Form handling and validation shared with the backend rules |

---

## 3. Backend

### 3.1 Node.js + Express.js + TypeScript
- **What it does:** Exposes the REST API for uploads, share creation, password verification, and downloads.
- **Why this choice:** Express is minimal and well documented, so every request path is easy to follow and debug.
- **Core packages:**
  ```bash
  npm install express cors helmet multer zod bcryptjs node-cron express-rate-limit dotenv
  npm install -D typescript tsx @types/node @types/express @types/multer @types/cors @types/bcryptjs
  ```
- **Dev runner:** `tsx watch src/server.ts` runs TypeScript directly with auto-restart.

### 3.2 Multer (file uploads)
- **What it does:** Parses `multipart/form-data` and writes files to disk.
- **Configuration notes:**
  - Set `limits.fileSize` to 100 MB (`100 * 1024 * 1024`).
  - Store files under a randomly generated name, never the original filename, to avoid path traversal and name collisions.
  - Keep the original name only as database metadata.

### 3.3 Zod (validation)
- **What it does:** Validates request bodies, route params, and environment variables at runtime.
- **Rules to enforce:**
  - `expiresIn` must be one of `10m`, `1h`, `24h`
  - `maxDownloads` must be one of `1`, `3`, `10`
  - `password`, if present, has a minimum length (for example 8) and a maximum length (for example 128)
  - `token` matches the expected format and length

### 3.4 Helmet and CORS
- **Helmet:** Adds secure HTTP headers such as `X-Content-Type-Options` and `Strict-Transport-Security`.
- **CORS:** Allow only the frontend origin, not `*`.

### 3.5 express-rate-limit
- **What it does:** Limits requests per IP using an in-memory store, so no Redis is needed.
- **Suggested limits:**
  - Upload: a small number per minute per IP
  - Password verification: strict, for example 5 attempts per 15 minutes per IP and token, to slow brute force
  - Download: moderate
- **Limitation:** The in-memory store resets on restart and is not shared between servers. This is acceptable for v1.

### 3.6 node-cron (background cleanup)
- **What it does:** Schedules the cleanup job inside the same Node process.
- **Example schedule:** `*/5 * * * *` runs every 5 minutes.
- **Job steps:**
  1. Find shares where `expires_at < now()` or `downloads_used >= max_downloads`, and that are not yet deleted.
  2. Delete each file from disk.
  3. Mark the share as `deleted_at = now()` in PostgreSQL.
  4. Log failures and retry on the next run.

---

## 4. Database and ORM

### 4.1 PostgreSQL
- **What it does:** Stores share metadata, access rules, and expiry information.
- **Why this choice:** It supports atomic conditional updates, which is the foundation of the download limit guarantee.
- **Free options:**
  - Local install or Docker for development
  - Free hosted tiers (such as Neon or Supabase) for later testing
- **Docker one-liner for development:**
  ```bash
  docker run --name filetransfer-db -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres
  ```

### 4.2 Prisma ORM
- **What it does:** Generates a type-safe client from `schema.prisma` and manages migrations.
- **Setup:**
  ```bash
  npm install prisma @prisma/client
  npx prisma init
  npx prisma migrate dev --name init
  ```
- **Useful tool:** `npx prisma studio` opens a browser UI to inspect data.

### 4.3 Suggested schema

```prisma
model Share {
  id            String    @id @default(cuid())
  tokenHash     String    @unique
  passwordHash  String?
  maxDownloads  Int
  downloadsUsed Int       @default(0)
  expiresAt     DateTime
  createdAt     DateTime  @default(now())
  deletedAt     DateTime?
  files         File[]

  @@index([expiresAt])
}

model File {
  id           String   @id @default(cuid())
  shareId      String
  share        Share    @relation(fields: [shareId], references: [id], onDelete: Cascade)
  originalName String
  storedName   String   @unique
  sizeBytes    Int
  mimeType     String
  sha256       String
  createdAt    DateTime @default(now())
}
```

**Design notes**
- Store a **hash of the share token** (`tokenHash`), not the raw token, so a database leak does not expose working links.
- Keep a `deletedAt` column so deleted shares stay auditable and are rejected cleanly.
- `onDelete: Cascade` removes file rows when a share is removed.

### 4.4 Atomic download reservation
This is the most important query in the project. Use a single conditional update so concurrent requests cannot exceed the limit:

```ts
const reserved = await prisma.$executeRaw`
  UPDATE "Share"
  SET "downloadsUsed" = "downloadsUsed" + 1
  WHERE "tokenHash" = ${tokenHash}
    AND "deletedAt" IS NULL
    AND "expiresAt" > NOW()
    AND "downloadsUsed" < "maxDownloads"
`;

if (reserved === 0) {
  // expired, exhausted, deleted, or invalid: reject
}
```

If `reserved` is `1`, the download slot is yours and you may stream the file.

---

## 5. Security and Cryptography

### 5.1 Node.js `crypto`
| Use | API |
|---|---|
| Share token | `crypto.randomBytes(32).toString('base64url')` |
| Token hash for storage | `crypto.createHash('sha256').update(token).digest('hex')` |
| File integrity hash | `crypto.createHash('sha256')` over the file stream |
| Safe comparisons | `crypto.timingSafeEqual` |
| Random stored filenames | `crypto.randomUUID()` |

- 32 random bytes gives 256 bits of entropy, which is not guessable.
- Never use `Math.random()` for anything security related.

### 5.2 bcryptjs (password hashing)
- **What it does:** Hashes optional share passwords with a salt and a work factor.
- **Why this choice:** It is pure JavaScript, so it installs everywhere without native build tools.
- **Usage:**
  ```ts
  const hash = await bcrypt.hash(password, 12);
  const ok = await bcrypt.compare(input, hash);
  ```
- **Upgrade path:** Argon2id (via the `argon2` package) is stronger and can replace bcryptjs later. Store hashes with their algorithm prefix so both can coexist during migration.

### 5.3 Password flow
1. Receiver opens `/s/:token`.
2. If the share has a password, the API returns only `{ passwordRequired: true }`, with no file name, size, or counts.
3. Receiver submits the password to the verify endpoint.
4. On success the server issues a short-lived access proof (see 5.4), and then metadata is returned.

### 5.4 Short-lived access proof (no Redis)
Use a signed token created with Node's `crypto.createHmac` (or the `jsonwebtoken` package) that contains the share ID and a 5 minute expiry, signed with a server secret. The download endpoint requires it for password-protected shares. This keeps the design stateless without Redis.

### 5.5 Download hardening checklist
- Files live in a private folder outside any `express.static` path.
- Stream with `res.download` or `fs.createReadStream`, and set `Content-Disposition: attachment`.
- Set `X-Content-Type-Options: nosniff`.
- Sanitize the filename used in headers.
- Reject any request that fails the atomic reservation, even if the token is valid.

### 5.6 Transport security
- Use HTTPS everywhere in production. During local development HTTP is acceptable.
- Free HTTPS options: Let's Encrypt, or the HTTPS provided by free hosting platforms and CloudFront.

---

## 6. File Storage

### 6.1 Local filesystem (development and v1)
- Store files in `server/uploads/`, which is git-ignored and never served statically.
- Use random stored names, for example `uploads/<uuid>`.
- Wrap storage in a small interface so S3 can replace it later:
  ```ts
  interface StorageProvider {
    save(stream: Readable, key: string): Promise<void>;
    read(key: string): Readable;
    delete(key: string): Promise<void>;
  }
  ```

### 6.2 Optional later: AWS S3
- Browser uploads directly with pre-signed PUT URLs.
- After authorization the backend issues a short-lived pre-signed GET URL.
- Keep the bucket private with Block Public Access enabled.
- Add an S3 lifecycle rule as a backup safety net for old objects.

---

## 7. Configuration and Environment

### 7.1 Environment variables (`server/.env`)
```
PORT=4000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/filetransfer
CLIENT_ORIGIN=http://localhost:5173
ACCESS_PROOF_SECRET=change-me-to-a-long-random-string
UPLOAD_DIR=./uploads
MAX_FILE_SIZE_MB=100
```

- Validate these with Zod at startup so the server fails fast on missing values.
- Never commit `.env`. Commit a `.env.example` instead.

### 7.2 Production secrets (optional AWS)
Store secrets in AWS Systems Manager Parameter Store as `SecureString` values and load them at startup.

---

## 8. API Design (REST)

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/api/shares` | Upload files with options (expiry, limit, password) and return the share link |
| `GET` | `/api/shares/:token` | Return `passwordRequired`, or metadata if no password is set |
| `POST` | `/api/shares/:token/verify` | Verify password and return an access proof |
| `GET` | `/api/shares/:token/files/:fileId/download` | Reserve a download atomically and stream the file |
| `GET` | `/api/health` | Health check |

**Response rules**
- Return the same generic error for "not found", "expired", and "exhausted" where possible, to avoid leaking which tokens exist.
- Use appropriate status codes: `400`, `401`, `404`, `410` (expired or gone), `429` (rate limited).

---

## 9. Developer Tooling

| Tool | Purpose |
|---|---|
| Git + GitHub | Version control |
| VS Code | Editor, with ESLint, Prettier, and Prisma extensions |
| ESLint + Prettier | Code quality and formatting |
| Docker (optional) | Run PostgreSQL locally without installing it |
| Postman or Thunder Client | Manually test API endpoints |
| Prisma Studio | Inspect database rows |

---

## 10. Testing (Recommended)

| Tool | Use |
|---|---|
| Vitest | Unit tests for token, password, and expiry logic |
| Supertest | API tests against the Express app |
| Manual concurrency test | Fire many parallel download requests (for example with a small script or `autocannon`) at a share limited to 1 download and confirm exactly one succeeds |

**Key test cases**
- Expired share is rejected before the cleanup job runs
- Exhausted share is rejected
- Wrong password never reveals metadata
- Upload over 100 MB is rejected
- Concurrent downloads never exceed `maxDownloads`
- Cleanup job removes the file from disk and sets `deletedAt`

---

## 11. Deployment Options

### 11.1 Free or low-cost starter (simplest)
| Part | Option |
|---|---|
| Frontend | Vercel, Netlify, or Cloudflare Pages (free tiers) |
| Backend | Render or Railway (free or trial tiers, with limits) |
| Database | Neon or Supabase PostgreSQL (free tier) |

**Caveat:** Many free backend hosts have ephemeral disks, so local file storage may be wiped on restart. For a real deployment, use S3 or a persistent disk.

### 11.2 AWS (optional Task 5)
| Part | Service |
|---|---|
| Frontend | S3 + CloudFront |
| Backend | EC2 or App Runner |
| File storage | S3 with pre-signed URLs |
| Secrets | SSM Parameter Store |
| Database | RDS PostgreSQL, or an external free PostgreSQL |

---

## 12. Recommended Build Order

1. Set up the repo with `client/` and `server/`, plus PostgreSQL and Prisma.
2. Build the `Share` and `File` schema and run the first migration.
3. Implement token generation and the upload endpoint.
4. Implement metadata, verify, and download endpoints with the atomic reservation.
5. Build the sender UI with drag-and-drop, options, and progress.
6. Build the receiver UI with the password step, metadata, and download.
7. Add rate limiting, Helmet, CORS, and validation.
8. Add the cron cleanup job.
9. Write the key tests, especially the concurrency test.
10. (Optional) Add the S3 storage provider and deploy.

---

## 13. Known Trade-offs in This Stack

| Decision | Benefit | Trade-off |
|---|---|---|
| No Redis | Fewer moving parts | In-memory rate limits reset on restart and do not scale across servers |
| bcryptjs | Easy install | Slower and less memory-hard than Argon2id |
| Local file storage | Zero setup | Not suitable for multi-server or ephemeral hosts |
| node-cron in the API process | Simple | Cleanup stops if the server is down, so request-time expiry checks stay essential |
| Server-side file upload through Express | Easy to understand | Uses server bandwidth; S3 pre-signed URLs fix this later |
