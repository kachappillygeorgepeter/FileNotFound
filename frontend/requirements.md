# Frontend Requirements & Technical Specification
# Project: FileNotFound — Zero-Trust Temporary File Transfer System

## 1. System Overview & Architecture

`FileNotFound` is a privacy-first, zero-trust temporary file-sharing web application. The frontend provides an intuitive, highly secure, and responsive user experience for two core workflows:
1. **Sender Portal (`/`)**: Staging and uploading files (drag-and-drop, up to 100 MB total), setting self-destruction parameters (time-based expiry and atomic download caps), optional password protection, and generating a one-time sharing link.
2. **Receiver Portal (`/s/:token`)**: Decoupled access gateway with strict zero-information disclosure before authentication, challenge verification for password-protected shares, countdown timers, downloads-remaining badges, and atomic single-file or bundle ZIP downloads.

---

## 2. Technology Stack & Dependencies

Strictly decoupled client architecture built with modern TypeScript tooling:

### 2.1 Core Framework & Tooling
| Package / Tool | Purpose | Configuration / Details |
|---|---|---|
| **Node.js** | Runtime | `>= 20.0.0` (LTS recommended) |
| **Vite** | Build Tool & Dev Server | Fast HMR, ESM bundling, proxy routing configured for `/api` |
| **React 19** | UI Library | Concurrent rendering, latest hooks (`useTransition`, `useOptimistic`) |
| **TypeScript** | Type Safety | Strict mode (`strict: true`), shared schemas and interfaces |

### 2.2 Routing, State & HTTP
| Package | Purpose | Configuration / Details |
|---|---|---|
| **react-router-dom** | Client-side Routing | `createBrowserRouter` or `<BrowserRouter>` handling `/` and `/s/:token` |
| **@tanstack/react-query** | Server State Management | Cache management, automatic query invalidation, retry strategies, and query lifecycle states |
| **axios** | HTTP Client | Granular upload progress tracking (`onUploadProgress`), credentials (`withCredentials: true`), session header injection |

### 2.3 Styling, UX & Components
| Package | Purpose | Configuration / Details |
|---|---|---|
| **tailwindcss** | Utility CSS Framework | Responsive layouts, customized design tokens, and dark/light neutrality |
| **lucide-react** | SVG Icon System | Tree-shakeable icons (Upload, Download, File, Lock, Clock, Copy, Check, ShieldAlert, FileArchive, etc.) |
| **react-dropzone** | Drag & Drop Controller | File drag-and-drop zone with type filtering, total size calculation, and error catching |

### 2.4 Validation & Utilities
| Package | Purpose | Configuration / Details |
|---|---|---|
| **zod** | Client Validation | Strict input schemas matching backend validation rules |
| **clsx** / **tailwind-merge** | Class Management | Conditional and conflict-free Tailwind class concatenation |

---

## 3. Directory Structure

The frontend application resides inside `FileNotFound/frontend` as an independent Vite SPA:

```
frontend/
├── imgs/
│   ├── logo.png
│   └── logo_no_bg.png
├── public/
│   └── favicon.ico
├── src/
│   ├── assets/
│   ├── components/
│   │   ├── common/
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── ProgressBar.tsx
│   │   │   ├── Badge.tsx
│   │   │   └── Header.tsx
│   │   ├── sender/
│   │   │   ├── Dropzone.tsx
│   │   │   ├── FileList.tsx
│   │   │   ├── ShareOptionsForm.tsx
│   │   │   ├── UploadProgressModal.tsx
│   │   │   └── ShareSuccessCard.tsx
│   │   └── receiver/
│   │       ├── PasswordChallenge.tsx
│   │       ├── ShareMetadataCard.tsx
│   │       ├── DownloadFileList.tsx
│   │       ├── ExpiredOrExhaustedState.tsx
│   │       └── LiveCountdown.tsx
│   ├── context/
│   │   └── SessionContext.tsx
│   ├── hooks/
│   │   ├── useUpload.ts
│   │   ├── useShareLookup.ts
│   │   ├── useDownload.ts
│   │   └── useCountdown.ts
│   ├── layouts/
│   │   └── RootLayout.tsx
│   ├── pages/
│   │   ├── UploadPage.tsx
│   │   ├── ReceiverPage.tsx
│   │   └── NotFoundPage.tsx
│   ├── services/
│   │   ├── api.ts
│   │   └── shareService.ts
│   ├── types/
│   │   └── share.ts
│   ├── utils/
│   │   ├── formatters.ts
│   │   └── error.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── index.html
├── package.json
├── tsconfig.json
├── tsconfig.node.json
├── tailwind.config.js
├── postcss.config.js
└── vite.config.ts
```

---

## 4. UI/UX Specifications & Visual Design Language

1. **Aesthetic Tone**:
   - Modern, high-security, utilitarian interface with clean typography and balanced whitespace.
   - Primary palette: Deep slate/black (`#0F172A`, `#1E293B`), neutral borders (`#E2E8F0` / dark `#334155`), clean white card surfaces, with tactical security accents (amber/emerald for active states, crimson for errors/expiry).
2. **Branding Assets**:
   - Brand logo assets located at `imgs/logo.png` and transparent `imgs/logo_no_bg.png`.
   - Prominently featured in header and share summary states.
3. **Accessibility & Feedback**:
   - Live ARIA live regions for upload percentages, download progress, and countdown warnings.
   - Micro-interactions: One-click clipboard copy with visual checkmark feedback, hover transitions on dropzone, animated indeterminate state bars.

---

## 5. Functional Requirements by Feature

### 5.1 Sender Flow: Upload & Share Creation (`/`)

#### 5.1.1 File Ingestion & Dropzone
- **Drag-and-Drop Area**: Multi-file drop target supporting click-to-browse and native file drag-and-drop.
- **Client-Side Restrictions**:
  - Maximum combined file size cap: **100 MB** (`104,857,600 bytes`).
  - Single-file cap: **100 MB**.
  - Zero-byte files rejected immediately with clear error toast/banner: `"Empty files (0 bytes) are not allowed."`.
  - Max file count safeguard: Up to 20 files per upload batch.
- **Selected Files Staging List**:
  - Display file name, formatted size (`KB`/`MB`), file type badge/icon, and remove (`✕`) action.
  - Total combined payload size indicator showing usage against the 100 MB ceiling.
  - "Clear All" action to reset dropzone.

#### 5.1.2 Share Expiration & Policy Configuration
- **Expiry Duration (`expiresIn`)**:
  - Segmented control or dropdown selector with allowed choices:
    - `10m` (10 minutes)
    - `1h` (1 hour) — *Default*
    - `24h` (24 hours)
- **Download Limit (`maxDownloads`)**:
  - Segmented control with allowed values:
    - `1` (One-time download / self-destruct after first use) — *Default*
    - `3` (3 downloads)
    - `10` (10 downloads)
- **Optional Password Protection (`password`)**:
  - Toggle checkbox: "Protect with password".
  - When enabled, shows password input field with show/hide toggle.
  - Validation rules: Minimum **8 characters**, maximum **128 characters**.
  - Strength indicator or validation feedback on invalid lengths.

#### 5.1.3 Upload Execution & Progress Tracking
- **Multipart Form Submission**:
  - Submits to `POST /api/shares` with `multipart/form-data`.
  - Fields: `files` (array), `expiresIn`, `maxDownloads`, and optional `password`.
- **Upload Progress Bar**:
  - Real-time percentage tracked via Axios `onUploadProgress`.
  - Display current uploaded bytes vs total bytes, upload speed estimation, and animated progress bar.
  - Cancel upload button triggering an `AbortController`.
- **Error Handling**:
  - Network timeouts, 400 validation failures, 413 file-too-large errors mapped to user-friendly notifications.

#### 5.1.4 Post-Upload Link Generation & Sharing
- Upon successful creation (status `201 Created`), transition to `ShareSuccessCard`:
  - Full sharing URL: `${window.location.origin}/s/${token}`.
  - One-click "Copy Link" button with copied notification indicator.
  - Share summary: Expiry timestamp, total downloads permitted, file count.
  - Prominent security reminder: *"This link will permanently expire once downloaded or timed out. Do not lose this link."*.
  - "Upload Another File" button to reset the portal.

---

### 5.2 Receiver Flow: Access, Authentication & Download (`/s/:token`)

#### 5.2.1 Initial Share Lookup (`GET /api/shares/:token`)
- On mount, trigger lookup query with the route `:token`.
- **Zero-Trust Information Shielding**:
  - If backend returns `{ passwordRequired: true }`:
    - Do NOT display file names, file sizes, download limits, or remaining time.
    - Render `PasswordChallenge` component immediately.
  - If share does not require a password:
    - Render `ShareMetadataCard` directly with full details.
  - If share is expired, exhausted, or deleted:
    - Backend returns `404` or `410` with generic message: `"Share not found or has expired."`.
    - Render `ExpiredOrExhaustedState` component.

#### 5.2.2 Password Verification Challenge (`POST /api/shares/:token/verify`)
- Form with password input and submit button.
- On submit: `POST /api/shares/:token/verify` with body `{ password: string }`.
- On error (`401 Unauthorized`): Display "Incorrect password. Please try again." with attempt counter warning.
- On success (`200 OK`):
  - Backend sets `access_session_token` HTTP-only cookie and returns `{ sessionToken, sessionExpiresAt, ...metadata }`.
  - Frontend stores `sessionToken` in application memory / state for inclusion in the `x-session-token` header if cookies are restricted.
  - Transition to `ShareMetadataCard`.

#### 5.2.3 Share Inspection & Metadata Presentation
- **Share Parameters**:
  - **Live Countdown Timer**: Dynamic real-time ticker calculated from `timeRemainingSeconds` / `expiresAt`. Automatically triggers expired state upon reaching `00:00:00`.
  - **Downloads Remaining**: Prominent badge displaying `${downloadsRemaining} of ${maxDownloads} downloads remaining`. Warning style if `downloadsRemaining === 1`.
- **File List Display**:
  - Display each file with sanitized original name, human-readable size (`bytes` formatted to KB/MB), and MIME type icon.
  - Individual "Download" button next to each file.
- **Download Actions**:
  - **Single-File Download**: Triggers `GET /api/shares/:token/files/:fileId/download`.
  - **Download All (ZIP)**: If multiple files exist, displays primary button `"Download All as ZIP"`, triggering `GET /api/shares/:token/download-all`.
  - **Atomic Warning Notice**: Clear modal prompt or warning:
    > *"Downloading will consume 1 download credit from the remaining limit. Ensure your connection is stable."*

#### 5.2.4 Download Streaming & Post-Download Feedback
- Requests sent with credentials (`withCredentials: true`) and `x-session-token` header.
- Proper handling of blob download triggers in browser via dynamic anchor element.
- Post-download automatic state refresh:
  - If the download was the final allowed download, immediately transition UI to the exhausted/deleted state.
  - Show confirmation toast: `"Download initiated successfully."`.

#### 5.2.5 Expired, Exhausted, or Not Found State
- Rendered for `404 Not Found` or `410 Gone`.
- Clean, informative security banner:
  - Shield / broken link icon.
  - Title: *"Link Expired or Unavailable"*.
  - Explanation: *"This shared link has expired, exceeded its maximum allowed downloads, or was deleted under zero-trust privacy policy."*.
  - Action button: *"Create New Share"*, routing to `/`.

---

## 6. API Integration Contracts

All endpoints communicate with the backend via JSON and standard streams.

### 6.1 Endpoints Specification

| Method | Endpoint | Description | Request Payload | Response Success | Key Error Statuses |
|---|---|---|---|---|---|
| `POST` | `/api/shares` | Create new share | `FormData` (`files`, `expiresIn`, `maxDownloads`, `password?`) | `201 Created`<br>`{ shareLink, expiresAt, maxDownloads, fileCount }` | `400` (Validation), `413` (Too large), `429` (Rate limited) |
| `GET` | `/api/shares/:token` | Lookup share | None | `200 OK`<br>`{ passwordRequired: true }`<br>OR<br>`{ passwordRequired: false, expiresAt, timeRemainingSeconds, downloadsRemaining, maxDownloads, files: [...] }` | `404` (Not found/expired), `429` (Rate limited) |
| `POST` | `/api/shares/:token/verify` | Verify password | `{ password: string }` | `200 OK`<br>`{ sessionToken, sessionExpiresAt, passwordRequired: false, ...metadata }`<br>*(Sets HTTP-only cookie)* | `401` (Incorrect password), `404` (Not found), `429` (Brute force throttled) |
| `GET` | `/api/shares/:token/metadata` | Fetch metadata (post-auth) | Headers: `x-session-token` | `200 OK`<br>`{ passwordRequired: false, expiresAt, timeRemainingSeconds, downloadsRemaining, maxDownloads, files: [...] }` | `401` (Session invalid/expired), `404` (Not found/exhausted) |
| `GET` | `/api/shares/:token/files/:fileId/download` | Download single file | Headers: `x-session-token` | `200 OK` (Binary file stream, `Content-Disposition: attachment`) | `401` (Unauthorized), `404` (Missing), `410` (Exhausted/expired) |
| `GET` | `/api/shares/:token/download-all` | Download ZIP archive | Headers: `x-session-token` | `200 OK` (ZIP stream `application/zip`) | `401` (Unauthorized), `404` (Missing), `410` (Exhausted/expired) |
| `GET` | `/api/health` | Backend status check | None | `200 OK` / `503 Service Unavailable` | `503` |

---

## 7. Security & Privacy Frontend Enforcements

1. **Zero Raw Password Storage**:
   - The password entered by the sender is sent in transit via HTTPS and discarded from client memory immediately after upload.
   - The password entered by the receiver is never saved to `localStorage` or `sessionStorage`.
2. **Session Token Handling**:
   - The verified receiver session token is stored in memory (`SessionContext`) and automatically sent via cookie or `x-session-token` header. Session lifespan is strictly 5 minutes.
3. **No File Blob Persistence**:
   - Files are not converted into permanent IndexedDB or persistent browser storage. Streams pipe directly to file save dialogs.
4. **Input Sanitization**:
   - File names displayed in the UI are sanitized to protect against cross-site scripting (XSS) and broken markup rendering.

---

## 8. State Management Architecture

- **Server Cache (`TanStack Query`)**:
  - `shareLookup` query keyed by `['share', token]`.
  - Configured with `staleTime: 10_000` (10 seconds), `refetchOnWindowFocus: true` to catch background expiry or download limit consumption by other recipients.
  - Mutation handlers for `uploadShare` and `verifyPassword`.
- **Local Reactive State (`React Hooks` / Context)**:
  - Dropzone staged files (`File[]`).
  - Upload upload progress percentage (`0 - 100`).
  - Active session state (`sessionToken`, `sessionExpiresAt`).
  - Real-time countdown timer tick hook with second-precision decrement.

---

## 9. Performance & Build Targets

- **Bundle Size Target**: Initial JS bundle `< 150 KB` gzipped.
- **Browser Compatibility**: Modern evergreen browsers (Chrome >= 110, Firefox >= 110, Safari >= 16.4, Edge >= 110).
- **Environment Configuration**:
  - `VITE_API_BASE_URL`: Base URL pointing to the Express server (default: `http://localhost:5000` or empty string when using Vite proxy).
- **Vite Proxy (`vite.config.ts`)**:
  ```ts
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  }
  ```

