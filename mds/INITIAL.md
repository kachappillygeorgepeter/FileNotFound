# Project Summary: Zero-Trust Temporary File Transfer System

## 1. Tech Stack

All tools below are free and open source, and chosen to be beginner friendly.

| Layer | Technologies | Purpose |
|---|---|---|
| Frontend | React 19, Vite, TypeScript | Build the user interface |
| UI & Styling | Tailwind CSS, Lucide React | Responsive design and icons |
| Data Fetching | TanStack Query (React Query), Axios | API requests, server-state management, and upload progress |
| Backend | Node.js, Express.js, TypeScript | Handle uploads, downloads, authentication, and expiry rules |
| File Upload Handling | Multer | Receive multipart file uploads in Express |
| Database | PostgreSQL | Store file metadata, access rules, and expiry information |
| ORM | Prisma | Communicate with the database with type-safe queries |
| Cryptography | Node.js `crypto` module | Generate secure share tokens and file hashes |
| Password Security | bcryptjs | Securely hash optional passwords (pure JavaScript, no native build step) |
| Rate Limiting | express-rate-limit (in-memory store) | Throttle abusive requests without needing Redis |
| Input Validation | Zod | Validate request bodies and parameters |
| Background Jobs | node-cron | Run the cleanup job every 5-10 minutes |
| Local Storage | Local filesystem (private `uploads/` folder) | Store uploaded files |
| Dev Tooling | tsx, dotenv, Prisma Studio | Run TypeScript, load config, inspect the database |
| Cloud (Optional, later) | AWS S3 free tier, CloudFront, EC2/App Runner, SSM Parameter Store | Production storage, hosting, backend deployment, and secret management |

**Notes on simplifications**
- **No Redis in v1.** Rate limiting uses an in-memory store, and download counts live in PostgreSQL where atomic updates are already available. Redis can be added later if the app runs on multiple servers.
- **bcryptjs instead of Argon2id** to avoid native compilation problems on beginner setups. It can be swapped for Argon2id later without changing the design.
- **Local filesystem instead of MinIO** so there is nothing extra to install. The storage code should sit behind a small interface so S3 can replace it later.

## 2. What Is the Project?

The goal is to build a secure, zero-trust file-sharing application where users can upload sensitive files and share them through temporary, protected links.

Unlike ordinary file-sharing services, every share has strict access rules. Files automatically become unavailable after a specified time or number of downloads.

## 3. Core Tasks and Features

### Task 1: Secure Upload Portal — Sender
- Drag-and-drop single or multiple files, up to 100 MB.
- Choose an expiry time: 10 minutes, 1 hour, or 24 hours.
- Set a download limit: 1, 3, or 10 downloads.
- Optionally protect the share with a password.
- Display upload progress and generate a temporary sharing link.

### Task 2: Secure Download Portal — Receiver
- Open the share using a unique, unguessable link.
- Verify the password before revealing file information.
- Display file name, size, time remaining, and downloads remaining.
- Download the file securely.
- Reject expired links and exhausted download limits.

### Task 3: Backend API and Security
- Create upload, share creation, password verification, and download APIs with Express.js.
- Generate cryptographically secure share tokens with Node.js `crypto.randomBytes`.
- Store file metadata and access rules in PostgreSQL through Prisma.
- Enforce download limits atomically to prevent concurrent requests from exceeding the cap.
- Add rate limiting and secure password handling.

### Task 4: Expiry and Automatic Cleanup
- Run a node-cron background job every 5-10 minutes.
- Delete expired or exhausted files from storage.
- Mark deleted shares in the database.
- Ensure expired links cannot be used even before the next cleanup run.

### Task 5: AWS Deployment — Optional
- Upload files directly to S3 using pre-signed PUT URLs.
- Generate short-lived pre-signed GET URLs for downloads after authorization.
- Host the frontend on S3 and CloudFront.
- Deploy the backend on EC2 or App Runner.
- Store application secrets in AWS Systems Manager Parameter Store.

## 4. Important Security Considerations

- **One-time downloads:** Reserve each download atomically before serving the file, so concurrent requests cannot bypass the limit. With Prisma and PostgreSQL, use a single conditional update, for example `UPDATE ... SET downloads_used = downloads_used + 1 WHERE token = $1 AND downloads_used < max_downloads AND expires_at > now()`, and only serve the file if one row was updated.
- **Password protection:** Hash passwords with bcrypt, and verify them before exposing file metadata.
- **Temporary links:** Use high-entropy random tokens (at least 32 bytes from `crypto.randomBytes`), HTTPS, and server-side expiry checks.
- **Secure downloads:** Do not expose permanent storage URLs. Keep the `uploads/` folder outside any public static directory and stream files only through the authorized download endpoint.
- **Self-destruction:** Enforce expiry at request time and use the cleanup worker for physical deletion.
- **One-time passwords vs. passkeys:** In this specification, the optional password is a sender-defined shared secret, not necessarily a WebAuthn passkey.

## 5. Suggested Project Structure

```
project-root/
├── client/              # React + Vite + TypeScript
└── server/              # Express + TypeScript
    ├── prisma/          # schema.prisma and migrations
    ├── uploads/         # private file storage (git-ignored)
    └── src/
        ├── routes/      # upload, share, verify, download
        ├── services/    # token, password, storage logic
        ├── jobs/        # cleanup cron job
        └── middleware/  # rate limiting, validation, errors
```

## Final Deliverable

A working web application that lets a sender upload sensitive files, configure time and download limits, optionally add password protection, and share a secure link with a recipient. The recipient can access the files only while the configured rules permit it, after which the files become inaccessible and are deleted automatically.
