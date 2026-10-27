# Backend Requirements & Dependency Specification
# Project: FileNotFound - Zero-Trust Temporary File Transfer System

## Runtime Environment
Node.js: >= 20.0.0 (Tested on Node.js v24.x LTS)
npm: >= 10.0.0
PostgreSQL: >= 14.x (Tested on PostgreSQL 16.x)

---

## Core Production Dependencies (`dependencies`)

| Package | Version | Purpose |
|---|---|---|
| express | ^4.21.2 | Fast, minimalist REST API web framework for Node.js. |
| @prisma/client | ^5.22.0 | Next-generation type-safe ORM for database queries and transactions. |
| archiver | ^7.0.1 | Streaming archive generation for dynamic on-the-fly multi-file ZIP downloads. |
| bcryptjs | ^2.4.3 | Pure JavaScript password hashing library (configured at work factor 12). |
| cookie-parser | ^1.4.7 | Parse HTTP request `Cookie` headers for session-based receiver verification. |
| cors | ^2.8.5 | Connect/Express middleware for configuring origin whitelist and credentials. |
| dotenv | ^16.4.7 | Loads environment variables from `.env` file into `process.env`. |
| express-rate-limit | ^7.5.0 | In-memory tiered IP/token rate-limiting middleware for abuse mitigation. |
| helmet | ^8.0.0 | Secures Express apps by setting crucial HTTP response security headers. |
| multer | ^1.4.5-lts.1 | Middleware for handling `multipart/form-data` disk uploads. |
| node-cron | ^3.0.3 | Task scheduler in pure JavaScript for automatic background cleanup cycles. |
| zod | ^3.24.2 | TypeScript-first schema declaration and runtime data/env validation library. |

---

## Developer & Testing Dependencies (`devDependencies`)

| Package | Version | Purpose |
|---|---|---|
| typescript | ^5.8.2 | Typed superset of JavaScript with strict compiler configuration. |
| tsx | ^4.19.3 | TypeScript Execute and watch runner for hot-reloading development server. |
| prisma | ^5.22.0 | Prisma CLI for declarative migrations, introspection, and client generation. |
| vitest | ^5.0.5 | Blazing fast next-generation unit and integration test runner. |
| supertest | ^7.3.1 | HTTP assertions library for programmatic Express route and endpoint testing. |
| eslint | ^9.21.0 | Static code analysis tool to identify problematic patterns. |
| prettier | ^3.5.3 | Opinionated code formatter for consistent code style. |
| @types/node | ^22.13.10 | TypeScript definitions for Node.js standard libraries (`crypto`, `fs`, `stream`). |
| @types/express | ^5.0.0 | Type declarations for Express framework. |
| @types/cors | ^2.8.17 | Type declarations for CORS middleware. |
| @types/cookie-parser | ^1.4.10 | Type declarations for cookie-parser middleware. |
| @types/multer | ^1.4.12 | Type declarations for Multer upload handler. |
| @types/bcryptjs | ^2.4.6 | Type declarations for bcryptjs. |
| @types/node-cron | ^3.0.11 | Type declarations for node-cron task runner. |
| @types/archiver | ^6.0.3 | Type declarations for archiver ZIP streaming. |
| @types/supertest | ^7.2.1 | Type declarations for Supertest. |

---

## Operating System & Hardware Recommendations
- **OS**: Windows 10/11, macOS 12+, Ubuntu 20.04+ (Cross-platform compatible).
- **RAM**: Minimum 2 GB (4 GB recommended for concurrent builds and testing).
- **Disk Storage**: Sufficient disk space configured for `UPLOAD_DIR` (default `./uploads`).
