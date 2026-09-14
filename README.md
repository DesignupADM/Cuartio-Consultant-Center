# Curatio Consultant Center

A consultant management platform built for the **Curatio International Foundation**, connecting high-level consultants with humanitarian and infrastructure projects worldwide.

## Use Case

Curatio International Foundation works across legal, infrastructure, energy, and governance sectors in humanitarian contexts. This platform helps them manage a global network of consultants by:

- Maintaining a verified directory of experts with skills, experience, and sector specializations
- Posting project opportunities and matching them with the right consultants
- Streamlining the application and selection process with AI-assisted ranking
- Tracking analytics across regions, sectors, and consultant engagement

The platform has two user roles: **admins** who manage the directory and opportunities, and **consultants** who apply to projects and manage their profiles. Public opportunity pages allow external candidates to view and apply without an account.

## Tech Stack

**Frontend:** Next.js 15, React 19, TypeScript, Tailwind CSS v4, shadcn/ui

**Backend:** Firebase (Authentication, Firestore, Cloud Functions, Storage)

**AI:** Firebase Genkit with Gemini 2.5 Flash for CV extraction, opportunity generation, and consultant matching

**Email:** Resend for transactional and bulk notifications

**Hosting:** Firebase App Hosting

## Getting Started

### Prerequisites

- Node.js 20+
- Firebase project with Authentication, Firestore, Storage, and Cloud Functions enabled
- Resend API key for email functionality

### Setup

```bash
npm install
cp .env.example .env.local
# Configure environment variables in .env.local
npm run dev
```

The app runs at `http://localhost:3000`.

### Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server with Turbopack |
| `npm run build` | Create production build |
| `npm run lint` | Run ESLint |
| `npm test` | Run Playwright smoke tests |
| `npm run genkit:dev` | Start Genkit Developer UI for AI flow testing |

## Documentation

- [Architecture](docs/architecture.md)
- [Blueprint](docs/blueprint.md)
- [Backend Maturity Report](docs/backend-maturity-report.md)
- [Optimization Checklist](docs/optimization-checklist.md)
