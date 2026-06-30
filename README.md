# Clerio Code — AI-Powered Product Delivery Platform

Clerio Code is a full-stack SaaS platform that manages the entire software delivery lifecycle — from feature request to production release. It uses AI to generate PRDs, break down tasks, review code against requirements, and enforce quality before human approval.

**Live Demo:** [https://code.askclerio.dev](https://code.askclerio.dev)

## The Core Loop

```
Feature Request → PRD Generation → Task Breakdown → Implementation → AI Review → Fixes → Re-Review → Human Approval → Shipped
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React, Shadcn UI, TailwindCSS |
| API | Express, tRPC (type-safe end-to-end) |
| Auth | BetterAuth (GitHub OAuth + email/password) |
| Database | PostgreSQL + Prisma ORM |
| AI | AI SDK (Vercel), OpenRouter, Pinecone (vector search) |
| Workflows | Inngest (event-driven background jobs) |
| GitHub | Octokit (webhooks, PR tracking, diff analysis) |
| Billing | Razorpay (subscriptions, credits) |
| Monorepo | Turborepo + pnpm workspaces |
| Deployment | Vercel |

## Architecture

```
cleriocode/
├── apps/
│   ├── api/          → Express server (tRPC, webhooks, Inngest, BetterAuth)
│   └── web/          → Next.js frontend (App Router, Shadcn UI)
├── packages/
│   ├── ai/           → AI prompts, schemas, Pinecone client, chunking utils
│   ├── auth/         → BetterAuth configuration (GitHub OAuth)
│   ├── db/           → Prisma schema + client
│   ├── github/       → Octokit client, webhook verification, PR operations
│   ├── services/     → Domain logic (billing, PRD, tasks, releases, repos)
│   ├── trpc/         → tRPC router with 11 sub-routers
│   ├── utils/        → Shared validation schemas
│   └── workflows/    → Inngest functions (6 async workflows)
├── turbo.json
└── pnpm-workspace.yaml
```

## Pages & Screens

| Page | Route |
|------|-------|
| Landing Page | `/` |
| Login | `/login` |
| Register | `/register` |
| Dashboard | `/workspaces` |
| Workspace Overview | `/workspaces/[slug]` |
| Workspace Settings | `/workspaces/[slug]/settings` |
| Billing & Credits | `/workspaces/[slug]/billing` |
| Projects | `/workspaces/[slug]/projects` |
| Project Overview | `/workspaces/[slug]/projects/[id]` |
| Feature Requests | `/workspaces/[slug]/projects/[id]/features` |
| PRD Editor | `/workspaces/[slug]/projects/[id]/prd/[prdId]` |
| Task Board (Kanban) | `/workspaces/[slug]/projects/[id]/tasks` |
| Pull Requests | `/workspaces/[slug]/projects/[id]/pulls` |
| PR Detail + AI Review | `/workspaces/[slug]/projects/[id]/pulls/[prId]` |
| Project Settings (Repos) | `/workspaces/[slug]/projects/[id]/settings` |
| Releases & Approval | `/workspaces/[slug]/projects/[id]/releases` |

## Inngest Workflows

All long-running processes run as event-driven Inngest functions:

| Workflow | Event | Description |
|----------|-------|-------------|
| PRD Generation | `prd/generation.requested` | AI generates a structured PRD from a feature request |
| Task Breakdown | `task/generation.requested` | AI breaks an approved PRD into engineering tasks |
| AI Code Review | `pr/review.requested` | Fetches PR diff, chunks it, embeds in Pinecone, runs AI review, posts comments to GitHub |
| Re-Review | `pr/re-review.requested` | Reviews incremental diff against previous findings |
| Repo Sync | `repo/sync.requested` | Indexes full repository codebase into Pinecone for context-aware reviews |
| Release Check | `release/check.requested` | Validates all tasks done + reviews passed before allowing release |

Workflow progress is visible in the UI through polling and status badges.

## AI Features

- **PRD Generation** — Generates goals, requirements (prioritized), acceptance criteria, technical notes, non-goals, and edge cases
- **Task Breakdown** — Converts PRDs into actionable tasks with complexity estimates and ordering
- **Code Review** — Evaluates correctness, security, performance, reliability, readability, and maintainability. Issues are categorized as critical/warning/suggestion with structured Zod schemas
- **Context-Aware Review (RAG)** — Uses Pinecone vector search to retrieve relevant codebase context for deeper reviews
- **Re-Review** — Checks if previous issues were resolved and looks for new issues in incremental diffs
- **Status Invariant Enforcement** — Post-parse validation ensures `overallStatus: "passed"` cannot coexist with critical/warning findings

## GitHub Integration

Real GitHub integration via Octokit — no hardcoded data:

- **Repository Connection** — Connect repos via GitHub App installation
- **Webhook Events** — Receives `pull_request` events with HMAC-SHA256 signature verification (raw body parsing)
- **PR Tracking** — Tracks open PRs, head SHA, author, branch
- **Diff Analysis** — Fetches file-level diffs, chunks into 80-line segments for AI processing
- **Review Comments** — Posts AI review results as PR comments on GitHub
- **Codebase Sync** — Full repo indexing into Pinecone for context-aware reviews

## Database Schema

PostgreSQL with Prisma. Key models:

- **User / Session / Account** — BetterAuth compatible
- **Workspace** — Multi-tenant, with plan and credit fields
- **WorkspaceMember** — Roles: owner, admin, member
- **Project** — Belongs to workspace, connects to repos
- **FeatureRequest → PRD → Task** — Full product lifecycle chain
- **Repository → PullRequest → AIReview** — GitHub integration chain with review chaining (re-reviews link via `previousReviewId`)
- **Release** — Human-approved releases with version and approver
- **Subscription + ReviewCreditLedger** — Razorpay billing with credit tracking
- **RepoSync** — Codebase embedding status for each connected repository

## Setup Instructions

### Prerequisites

- Node.js 20+
- pnpm 9+
- PostgreSQL
- GitHub App (with webhook configured)
- Inngest account (or local dev server)
- Pinecone account
- OpenRouter API key
- Razorpay account (test mode)

### Installation

```bash
git clone https://github.com/himanshubalani/cleriocode.git
cd cleriocode
pnpm install
```

### Environment Variables

Create `.env` at the root:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/cleriocode"

# BetterAuth
BETTER_AUTH_SECRET="your-auth-secret"
BETTER_AUTH_URL="http://localhost:5000"

# GitHub App
GITHUB_APP_ID="your-app-id"
GITHUB_APP_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----"
GITHUB_WEBHOOK_SECRET="your-webhook-secret"
GITHUB_CLIENT_ID="your-client-id"
GITHUB_CLIENT_SECRET="your-client-secret"

# AI
OPENROUTER_API_KEY="your-openrouter-key"

# Pinecone
PINECONE_API_KEY="your-pinecone-key"
PINECONE_INDEX_NAME="cleriocode"

# Razorpay
RAZORPAY_KEY_ID="rzp_test_..."
RAZORPAY_KEY_SECRET="your-key-secret"
RAZORPAY_WEBHOOK_SECRET="your-webhook-secret"
RAZORPAY_PLAN_ID="plan_..."

# Inngest
INNGEST_EVENT_KEY="your-event-key"
INNGEST_SIGNING_KEY="your-signing-key"
```

Create `apps/web/.env`:

```env
NEXT_PUBLIC_API_URL="http://localhost:5000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### Database Setup

```bash
cd packages/db
npx prisma migrate dev --name init
npx prisma generate
```

### Run Development

```bash
# Start all apps (API + Web) via Turborepo
pnpm dev

# In a separate terminal, start Inngest dev server
npx inngest-cli@latest dev
```

- Web: http://localhost:3000
- API: http://localhost:5000
- Inngest: http://localhost:8288

### Build for Production

```bash
pnpm build
```

## GitHub App Setup

1. Create a GitHub App at https://github.com/settings/apps
2. Set webhook URL to `https://your-domain.com/webhooks/github`
3. Set webhook secret (same as `GITHUB_WEBHOOK_SECRET`)
4. Required permissions:
   - Repository: Contents (Read), Pull requests (Read & Write), Issues (Read)
   - Subscribe to events: Pull request
5. Generate a private key and add to env vars
6. Install the app on your repositories

## Razorpay Setup

1. Create a Razorpay account (test mode)
2. Create a subscription plan in the dashboard
3. Set webhook URL to `https://your-domain.com/webhooks/razorpay`
4. Subscribe to events: `subscription.activated`, `subscription.charged`, `subscription.cancelled`, `payment.failed`
5. Copy the webhook secret to `RAZORPAY_WEBHOOK_SECRET`

## SaaS & Billing

- **Free Plan** — 5 AI review credits/month, limited repos
- **Pro Plan** — 100 AI review credits/month, unlimited repos, premium workflows
- Credits are tracked in a ledger and replenished on subscription renewal
- Subscription lifecycle is fully handled via Razorpay webhooks

## License

MIT
