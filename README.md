# Curatio Consultant Center

A dual-portal consultant management platform built for the **Curatio International Foundation**, connecting a global network of high-level consultants with humanitarian and infrastructure projects.

## Purpose

The platform serves three interconnected surfaces:

- **Admin Portal** — Directory management, consultant verification, opportunity CRUD, AI-assisted matchmaking, analytics, email notifications, and system administration.
- **Consultant Portal** — Profile management, browsing and applying to opportunities, and viewing a verified expert network.
- **Public Surface** — Shareable public opportunity pages where anyone can view a project and apply through a guided flow.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router, Turbopack) |
| UI Library | React 19 |
| Language | TypeScript 5 |
| Styling | Tailwind CSS v4 |
| UI Components | shadcn/ui + Radix UI |
| Animation | Framer Motion |
| Rich Text | TinyMCE |
| Charts | Recharts |
| Forms | React Hook Form + Zod |
| Auth | Firebase Authentication (Email/Password, Google) |
| Database | Cloud Firestore (RBAC security rules) |
| Storage | Firebase Storage |
| Backend | Firebase Cloud Functions (Node 20) |
| AI | Firebase Genkit + Gemini 2.5 Flash |
| Email | Resend |
| Testing | Playwright |
| Hosting | Firebase App Hosting |

## Key Features

### Authentication & Authorization
- Firebase Authentication with email/password and Google sign-in
- Role-based access control (RBAC) with `admin` and `consultant` roles
- Admin invite flow via Cloud Functions (no self-elevation possible)
- Custom claims minted server-side for fast-path role resolution

### Consultant Directory
- Full CRUD for consultant profiles (admin-managed)
- Paginated listing with cursor-based pagination
- Multi-field filtering (country, profession, sector, status)
- Verification workflow (pending → verified → rejected)
- Bulk CSV import via webhook and manual import

### Opportunity Management
- Create, edit, publish, and close project opportunities
- Custom application form schema builder
- Public-facing opportunity pages (no auth required to view)
- Applicant pipeline with status management

### AI-Powered Features
- **CV Insight Extraction** — Analyzes uploaded CV PDFs and extracts structured summaries, skills, experience highlights, and qualifications
- **Opportunity Generator** — Drafts professional project briefs from minimal notes
- **Consultant-Opportunity Matching** — Ranks applicants against project briefs using a 0-100 scoring system

### Email & Notifications
- Resend-powered transactional email (single and bulk sends)
- Notification center for admin-to-consultant messaging
- Broadcast emails to all consultants
- System logs (append-only audit trail)

### Analytics
- Precomputed dashboard statistics maintained by Cloud Functions
- Executive analytics with charts: regional distribution, sector breakdown, skills supply/demand radar, mandate performance, monthly trends

### Webhook Integration
- `POST /api/webhooks/consultants` for external consultant directory ingestion
- HMAC-SHA256 signature verification
- Idempotent upsert semantics

## Getting Started

### Prerequisites
- Node.js 20+
- Firebase project with Authentication, Firestore, Storage, and Cloud Functions enabled
- Resend API key for email functionality

### Environment Variables

Copy `.env.example` to `.env.local` and configure:

```env
# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# AI (server-side only)
GENKIT_GOOGLE_GENAI_API_KEY=

# Email
RESEND_API_KEY=

# Webhook (optional)
WEBHOOK_SECRET=
```

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

The app runs at `http://localhost:3000` with Turbopack for fast HMR.

### Genkit Developer UI

```bash
npm run genkit:dev
```

Provides an isolated environment for testing AI flows.

### Testing

```bash
npm test
```

Playwright smoke tests with mock mode (`NEXT_PUBLIC_E2E_TEST=true`) that bypasses Firebase authentication.

### Build

```bash
npm run build
```

### Lint

```bash
npm run lint
```

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── login/              # Authentication
│   ├── register/           # Registration + admin invite activation
│   ├── dashboard/          # Protected dual-portal dashboard
│   │   ├── admin/          # Admin settings
│   │   ├── analytics/      # Executive analytics
│   │   ├── directory/      # Consultant directory
│   │   ├── opportunities/  # Opportunity management
│   │   └── notifications/  # Notification center
│   ├── public/             # Public opportunity pages
│   └── api/                # API routes (email, export, webhooks)
├── ai/                     # Firebase Genkit AI flows
│   └── flows/              # CV extraction, opportunity generation, matching
├── components/             # React components
│   ├── dashboard/          # Feature components
│   ├── editor/             # Rich text editing
│   └── ui/                 # 39 shadcn/ui primitives
├── firebase/               # Firebase integration layer
│   ├── auth/               # Authentication hooks
│   ├── firestore/          # Firestore hooks and types
│   └── storage/            # File upload utilities
├── lib/                    # Server-side and shared utilities
├── hooks/                  # Shared React hooks
└── firebase/               # Firebase config and providers

functions/                  # Firebase Cloud Functions (Node 20)
tests/                      # Playwright E2E tests
docs/                       # Architecture and design documentation
```

## Architecture Highlights

### Security
- Firestore rules enforce RBAC at the document level with attribute-level locks
- Admin self-elevation is impossible — only existing admins can create new admin roles
- API routes verify Firebase ID tokens server-side using the Admin SDK
- Webhook endpoint uses constant-time HMAC-SHA256 comparison
- System logs are append-only (create only, no update/delete)

### Performance
- Precomputed analytics document maintained by Cloud Functions eliminates collection scans
- Cursor-based paginated collection hook for all large lists
- Lazy loading for TinyMCE editor and chart libraries
- Memoized React components for table rows
- Bulk admin operations chunked at 400 writes/batch

### AI Architecture
- Three Genkit flows run as Next.js server actions
- Gemini API key stays server-side only (never exposed to the client bundle)
- Each flow uses Zod schemas for both input and output validation

## Deployment

The app is deployed on Firebase App Hosting with automatic deploys on push.

```bash
# Deploy Cloud Functions
firebase deploy --only functions

# Deploy Firestore rules and indexes
firebase deploy --only firestore:rules,firestore:indexes

# Deploy Storage rules
firebase deploy --only storage
```

## Documentation

- [Architecture](docs/architecture.md) — Complete technical architecture
- [Blueprint](docs/blueprint.md) — Original product requirements and design spec
- [Backend Maturity Report](docs/backend-maturity-report.md) — Security audit and remediation
- [Optimization Checklist](docs/optimization-checklist.md) — Performance optimization guide
