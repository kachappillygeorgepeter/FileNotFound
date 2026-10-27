# Database Schema & Naming Conventions

This document records the conventions established in **Phase 1** so that future raw SQL operations (such as the atomic reservation query in Phase 5) and migrations align cleanly with Prisma and PostgreSQL.

---

## 1. Table & Model Names

Prisma uses PascalCase for models, and PostgreSQL maps them with quoted exact names:

| Prisma Model | PostgreSQL Table Name | Purpose |
|---|---|---|
| `Share` | `"Share"` | Stores share metadata, hashes, download caps, and expiration timestamps. |
| `File` | `"File"` | Stores physical file references, sizes, MIME types, and SHA-256 hashes. |
| `AccessSession` | `"AccessSession"` | Stores short-lived session token hashes after successful password verification. |

> **Raw SQL Note:** When writing raw SQL queries via `prisma.$executeRaw` or `prisma.$queryRaw`, wrap table names in double quotes, e.g. `FROM "Share"`, `FROM "File"`, `FROM "AccessSession"`.

---

## 2. Field & Column Conventions

Fields follow **camelCase** in TypeScript and Prisma, and are mapped to double-quoted camelCase columns in PostgreSQL:

### `Share` (`"Share"`)
- `"id"`: `TEXT` (`cuid()`), Primary Key.
- `"tokenHash"`: `TEXT` (Unique), SHA-256 hash of the 32-byte URL share token.
- `"passwordHash"`: `TEXT` (Nullable), bcryptjs hash of optional share password.
- `"maxDownloads"`: `INTEGER`, allowed download limit (1, 3, or 10).
- `"downloadsUsed"`: `INTEGER` (Default `0`), atomically incremented.
- `"expiresAt"`: `TIMESTAMP(3)` WITH TIME ZONE, hard expiry timestamp.
- `"createdAt"`: `TIMESTAMP(3)` WITH TIME ZONE, default `NOW()`.
- `"deletedAt"`: `TIMESTAMP(3)` WITH TIME ZONE (Nullable), soft-delete / cleanup timestamp.

### `File` (`"File"`)
- `"id"`: `TEXT` (`cuid()`), Primary Key.
- `"shareId"`: `TEXT`, Foreign key referencing `"Share"("id")` with `ON DELETE CASCADE`.
- `"originalName"`: `TEXT`, sanitized original name for display/download header.
- `"storedName"`: `TEXT` (Unique), UUID-based disk storage filename.
- `"sizeBytes"`: `BIGINT`, exact file size in bytes.
- `"mimeType"`: `TEXT`, detected MIME type.
- `"sha256"`: `TEXT`, file content integrity checksum.
- `"createdAt"`: `TIMESTAMP(3)` WITH TIME ZONE, default `NOW()`.

### `AccessSession` (`"AccessSession"`)
- `"id"`: `TEXT` (`cuid()`), Primary Key.
- `"shareId"`: `TEXT`, Foreign key referencing `"Share"("id")` with `ON DELETE CASCADE`.
- `"sessionTokenHash"`: `TEXT` (Unique), SHA-256 hash of the short-lived session token.
- `"expiresAt"`: `TIMESTAMP(3)` WITH TIME ZONE, 5-minute expiry.
- `"createdAt"`: `TIMESTAMP(3)` WITH TIME ZONE, default `NOW()`.

---

## 3. Database Indexes

Optimized for fast lookups and high-frequency cleanup/verification queries:

1. `"Share_tokenHash_key"`: Unique index on `"Share"("tokenHash")` (share resolution).
2. `"Share_expiresAt_idx"`: Index on `"Share"("expiresAt")` (time-based expiry checks and cleanup worker).
3. `"Share_deletedAt_idx"`: Index on `"Share"("deletedAt")` (filtering out deleted shares).
4. `"File_storedName_key"`: Unique index on `"File"("storedName")`.
5. `"File_shareId_idx"`: Index on `"File"("shareId")` (efficient retrieval of files per share).
6. `"AccessSession_sessionTokenHash_key"`: Unique index on `"AccessSession"("sessionTokenHash")` (session validation).
7. `"AccessSession_shareId_idx"`: Index on `"AccessSession"("shareId")`.
8. `"AccessSession_expiresAt_idx"`: Index on `"AccessSession"("expiresAt")` (fast cleanup of expired sessions).

---

## 4. Phase 5 Atomic Reservation SQL Template

To ensure concurrency safety in Phase 5, the exact SQL syntax is:

```ts
const reserved = await prisma.$executeRaw`
  UPDATE "Share"
  SET "downloadsUsed" = "downloadsUsed" + 1
  WHERE "tokenHash" = ${tokenHash}
    AND "deletedAt" IS NULL
    AND "expiresAt" > NOW()
    AND "downloadsUsed" < "maxDownloads"
`;
```
