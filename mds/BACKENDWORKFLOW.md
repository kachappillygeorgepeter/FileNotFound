# Backend Workflow: Phase by Phase

Stack: Node.js, Express.js, TypeScript, PostgreSQL, Prisma, Node.js `crypto`, bcryptjs, Multer, Zod, express-rate-limit, node-cron.

## Design Decisions

- **Multiple files per share.** One share holds one or more files, uploaded together.
- **Access sessions in PostgreSQL.** After a correct password, the server stores a short-lived session row in the database instead of issuing a signed token. This allows instant revocation and needs no signing secret.
- **Download counting.** Each successful download request counts as one download against the limit, whether it is a single file or the "download all" ZIP. A share limited to 1 download allows either one single file or one ZIP, not both.
- **Tokens are never stored raw.** Only hashes of share tokens and session tokens go into the database.
- **Expiry is enforced at request time.** The cleanup job only handles physical deletion.

## Phase Overview

| Phase | Name | Main Outcome |
|---|---|---|
| 0 | Project Setup | Running Express server connected to PostgreSQL |
| 1 | Database and Schema | Migrated tables for shares, files, and sessions |
| 2 | Core Security Utilities | Tested token, hash, and session helpers |
| 3 | Upload and Share Creation | Multi-file upload that returns a share link |
| 4 | Receiver Endpoints | Share lookup and password verification |
| 5 | Atomic Download | Limit-safe single-file and ZIP downloads |
| 6 | Hardening | Rate limits, headers, validation, safe errors |
| 7 | Expiry and Cleanup | Scheduled deletion of expired data |
| 8 | Testing | Unit, API, and concurrency tests |
| 9 | Storage Abstraction and Deployment | Optional S3 and hosting |

---

## Phase 0: Project Setup

**Goal:** A running TypeScript Express server that connects to PostgreSQL and fails fast on bad configuration.

**Tasks**
1. Create the `server/` folder and initialize a Node project with TypeScript.
2. Install the core dependencies: Express, CORS, Helmet, Multer, Zod, bcryptjs, node-cron, express-rate-limit, dotenv, Prisma, and an archiving library for ZIP streaming.
3. Install the development dependencies: TypeScript, tsx, and the type packages.
4. Configure `tsconfig`, an npm script for the dev server with auto-restart, and a build script.
5. Start PostgreSQL locally, preferably through Docker.
6. Create the `.env` and `.env.example` files with the port, database URL, client origin, upload directory, and size limits.
7. Add a startup config module that validates every environment variable with Zod and exits with a clear message if any is missing or invalid.
8. Set up the folder structure: `routes`, `controllers`, `services`, `middleware`, `jobs`, `utils`, and `config`.
9. Create the Express app and server entry files as separate modules, so the app can be tested without starting a port.
10. Add a health endpoint that also checks the database connection.
11. Add `.gitignore` entries for `.env`, `node_modules`, and the uploads directory.
12. Set up ESLint and Prettier.

---

## Phase 1: Database and Schema

**Goal:** A migrated PostgreSQL schema that models shares, files, and access sessions.

**Tasks**
1. Initialize Prisma and point it at the database URL.
2. Define the **Share** model with these fields: ID, token hash (unique), optional password hash, maximum downloads, downloads used, expiry time, created time, and optional deleted time.
3. Define the **File** model with these fields: ID, share reference, original name, stored name (unique), size in bytes, MIME type, SHA-256 hash, and created time. Link each file to its share with cascade delete.
4. Define the **AccessSession** model with these fields: ID, share reference, session token hash (unique), expiry time, and created time. Link it to its share with cascade delete.
5. Add indexes on the share expiry time, the share deleted time, and the session expiry time to speed up cleanup queries.
6. Run the first migration and confirm the tables exist.
7. Create a single shared Prisma client module for the whole app.
8. Open Prisma Studio and insert a manual test row to confirm the relations work.
9. Decide and document the naming conventions, such as field casing and table names, so raw SQL in Phase 5 matches the schema exactly.

---

## Phase 2: Core Security Utilities

**Goal:** Small, independent, well-tested helpers for everything security related, so later phases only call them.

**Tasks**
1. **Token generator:** produce a 32-byte random token encoded in URL-safe form, using Node's `crypto.randomBytes`.
2. **Token hasher:** produce a SHA-256 hash of a token for database storage and lookup.
3. **Password hasher:** hash passwords with bcryptjs at a work factor of 12, and provide a matching compare function.
4. **Session helpers:** create a session token, store only its hash with a 5 minute expiry, and provide a lookup that checks the hash, the share it belongs to, and the expiry time.
5. **Safe comparison helper:** wrap `crypto.timingSafeEqual` for any direct secret comparison.
6. **Stored filename generator:** produce a random UUID-based name with no relation to the original filename.
7. **File hash helper:** compute a SHA-256 hash of a file by streaming it, so large files do not load into memory.
8. **Filename sanitizer:** clean original filenames for use in download headers and for display.
9. **Expiry parser:** convert the allowed options (10 minutes, 1 hour, 24 hours) into an expiry date, and reject anything else.
10. Write unit tests for each helper before moving on.

---

## Phase 3: Upload and Share Creation

**Goal:** A single endpoint accepts one or more files plus options, and returns a secure share link.

**Tasks**
1. Define the Zod schema for the options: expiry choice, download limit choice (1, 3, or 10), and an optional password with minimum and maximum lengths.
2. Configure Multer for disk storage with a 100 MB limit per file and a maximum number of files per share.
3. Add a total-size check across all files in a share, and decide on the total cap (for example 100 MB combined, or a higher figure if you prefer).
4. Direct Multer to write into the private uploads directory using generated random names, never the original names.
5. Build the share creation endpoint so it runs these steps in order:
   - Validate the options.
   - Receive and store the files.
   - Compute the SHA-256 hash of each stored file.
   - Generate the token and its hash.
   - Hash the password if one was provided.
   - Save the share and all its file records in one database transaction.
   - Return the link containing the raw token, once.
6. Make sure the raw token and the raw password are never logged and never stored.
7. Handle failures safely: if the database save fails or validation fails after files were written, delete those files from disk immediately.
8. Handle Multer errors (file too large, too many files, unexpected field) and map them to clear, safe error responses.
9. Reject empty uploads and zero-byte files.
10. Return only what the sender needs: the share link, the expiry time, the download limit, and the file count.
11. Test with several files, one file, an oversized file, and an invalid option.

---

## Phase 4: Receiver Endpoints

**Goal:** The receiver can look up a share and verify a password, and no file information is revealed before verification.

**Tasks**
1. Build a shared share-resolution step that hashes the incoming token, finds the share, and rejects it if it is missing, deleted, expired, or already exhausted. Use the same generic error for all of these cases so token existence is not leaked.
2. **Lookup endpoint:**
   - If the share has a password, return only a flag saying a password is required. Do not return file names, sizes, counts, or time remaining.
   - If there is no password, return the full metadata: the file list with names and sizes, time remaining, and downloads remaining.
3. **Verify endpoint:**
   - Compare the submitted password against the stored hash.
   - On success, create an access session row with a hashed session token and a 5 minute expiry.
   - Return the raw session token once, along with the share metadata.
   - On failure, return a generic error and do not reveal any metadata.
4. Decide how the session token travels with later requests. Use a request header, or an HTTP-only cookie if you want it handled automatically by the browser.
5. Build a session-check step used by protected endpoints: it verifies the session hash, the share match, and the expiry time against PostgreSQL.
6. Make the metadata endpoint for password-protected shares require a valid session.
7. Calculate "time remaining" and "downloads remaining" on the server, never trusting the client.
8. Make sure password comparison still takes similar time whether the share exists or not, to reduce timing leaks.

---

## Phase 5: Atomic Download

**Goal:** Downloads can never exceed the limit, even with many simultaneous requests, and files are streamed only after a successful reservation.

**Tasks**
1. Write the **reservation step** as a single conditional database update that increments the downloads-used counter only when all of these are true: the token hash matches, the share is not deleted, it has not expired, and downloads used is still below the maximum.
2. Treat the reservation result strictly: one updated row means success, zero rows means reject.
3. Build the **single-file download endpoint:**
   - Resolve the share and check the session if the share is password protected.
   - Confirm the requested file belongs to that share.
   - Run the reservation.
   - On success, stream the file with an attachment disposition, a sanitized filename, and a no-sniff header.
4. Build the **download-all ZIP endpoint:**
   - Apply the same share and session checks.
   - Run one reservation for the whole ZIP, which counts as one download.
   - Stream a ZIP of all files directly to the response without building it fully in memory.
5. Make sure the reservation always happens before any bytes are streamed.
6. Handle failures after reservation, such as a missing file on disk or a dropped connection. Decide and document the policy, for example not refunding the download for simplicity and security.
7. Never expose real storage paths or stored names to the client.
8. Prevent path traversal by looking files up only through database records, never from client-supplied paths.
9. After a successful download, if the limit is now reached, mark the share as ready for cleanup (the cleanup job in Phase 7 will physically delete it).
10. Return a clear response when the limit is reached or the share has expired, using the same generic error style as Phase 4.

---

## Phase 6: Hardening

**Goal:** Reduce abuse, close common web vulnerabilities, and keep error responses safe.

**Tasks**
1. Add **Helmet** for secure default headers.
2. Configure **CORS** to allow only the configured frontend origin.
3. Add **rate limiting** with different rules per endpoint group:
   - Upload: a small number of requests per minute per IP.
   - Password verification: very strict, keyed by IP and share token together, to slow brute force.
   - Lookup and download: moderate limits.
4. Add a global request size limit for JSON bodies.
5. Add a **centralized error handler** that logs details internally but returns only generic messages to clients, with no stack traces.
6. Add consistent status codes: bad input, unauthorized, not found, gone (expired), and too many requests.
7. Add request validation middleware using the Zod schemas for every route.
8. Add basic structured logging that records events like uploads, failed password attempts, and cleanup runs, and never records tokens, passwords, or session tokens.
9. Set trusted proxy settings correctly if the app will run behind a proxy, so rate limiting sees real client IPs.
10. Add graceful shutdown handling that stops accepting requests, finishes in-flight ones, and closes the database connection.
11. Review dependencies for known vulnerabilities with the package manager's audit command.

---

## Phase 7: Expiry and Cleanup

**Goal:** Expired and exhausted shares are physically deleted on a schedule, while request-time checks keep them unusable in between.

**Tasks**
1. Create a cleanup service separate from the cron wiring, so it can be tested directly.
2. Define what qualifies for deletion: shares past their expiry time, shares whose downloads used has reached the maximum, and shares not yet marked deleted.
3. For each qualifying share:
   - Delete every file belonging to it from storage.
   - Mark the share as deleted with a timestamp.
   - Optionally clear the password hash and file path data you no longer need.
4. Delete expired access session rows in the same run.
5. Process shares in small batches so one run never loads or locks too much.
6. Make the job **idempotent and fault tolerant:** if a file is already missing, continue; if one share fails, log it and move on; anything that failed gets retried on the next run.
7. Schedule the job with node-cron every 5 minutes.
8. Prevent overlapping runs, so a slow run does not collide with the next scheduled one.
9. Add an orphan sweep that finds files on disk with no matching database record (for example from failed uploads) and removes the old ones.
10. Decide how long to keep deleted share rows for auditing, and add a periodic purge of very old records if desired.
11. Log the number of shares, files, and sessions removed in each run.

---

## Phase 8: Testing

**Goal:** Prove the security guarantees with automated tests, especially the download limit.

**Tasks**
1. Set up Vitest and Supertest, and a separate test database that is reset between runs.
2. **Unit tests:** token generation and hashing, password hashing and comparison, expiry parsing, filename sanitizing, and session creation and expiry.
3. **API tests for upload:** multiple files, a single file, an oversized file, too many files, an invalid expiry, an invalid limit, and a bad password length.
4. **API tests for receiver flow:** unknown token, expired share, exhausted share, protected share without a password, wrong password, correct password, and an expired session.
5. **Download tests:** single-file download, ZIP download, a file ID from a different share, and a request with no session on a protected share.
6. **Concurrency test:** fire many parallel download requests at a share limited to 1 download and confirm exactly one succeeds. Repeat for limits of 3 and 10.
7. **Request-time expiry test:** set a share's expiry to the past without running cleanup, and confirm every endpoint rejects it.
8. **Cleanup tests:** expired and exhausted shares are deleted from disk and marked deleted, expired sessions are removed, and active shares are untouched.
9. **Rate limit tests:** confirm that repeated wrong passwords are throttled.
10. **Leak checks:** confirm that logs and error responses never contain tokens, passwords, or storage paths.
11. Add a single npm script that runs the full test suite.

---

## Phase 9: Storage Abstraction and Deployment (Optional)

**Goal:** Prepare the backend for cloud storage and deploy it, without changing the API.

**Tasks**
1. Define a storage interface with save, read, and delete operations, and move the local filesystem code behind it.
2. Update upload, download, ZIP, and cleanup code to use only that interface.
3. Add an S3 implementation, keeping the bucket private with public access blocked.
4. For the S3 path, add the pre-signed upload flow: the backend issues short-lived upload URLs, then the client confirms completion so the share is created.
5. For downloads on S3, keep the reservation step first, then issue a short-lived pre-signed download URL or stream through the backend.
6. Add an S3 lifecycle rule as a safety net for objects the cleanup job misses.
7. Move production secrets into AWS Systems Manager Parameter Store and load them at startup.
8. Deploy the backend to EC2 or App Runner, or to a free hosting service for early testing.
9. Point the backend at a hosted PostgreSQL instance and run the migrations in the deployment pipeline.
10. Enable HTTPS and set the production CORS origin.
11. Add a health check and basic monitoring and alerts for errors and failed cleanup runs.
12. Run a final end-to-end test against the deployed environment.

---

## Cross-Phase Checklist

- Raw tokens, session tokens, and passwords are never stored or logged.
- Metadata is never exposed before password verification.
- The download reservation always happens before streaming.
- Expiry is checked on every request, not only by the cleanup job.
- Files are never served from a public directory.
- Original filenames are used only for display and download headers.
