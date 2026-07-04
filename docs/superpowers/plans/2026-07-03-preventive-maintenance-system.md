# Preventive Maintenance System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a multi-tenant web app where small property operators (hotels, apartments, villas) track devices, warranty/purchase info, vendor contacts, recurring maintenance schedules, and repair ticket history per property.

**Architecture:** Next.js (App Router, TypeScript) as a single full-stack app. Business logic lives in a framework-independent service layer (`lib/services/*`) backed by Prisma against Postgres; UI pages call services directly via Server Actions (no separate REST API layer — YAGNI for a single-frontend app). Auth.js handles session-based login; org-scoping is enforced in application code on every service call, not via database RLS.

**Tech Stack:** Next.js 14 (App Router, TypeScript), Prisma ORM, Postgres (local via Docker for dev/test; Neon in production — production deploy is out of scope for this plan), Auth.js v5 (Credentials provider), bcryptjs, Vitest.

## Global Constraints

- TypeScript strict mode enabled project-wide.
- Every service function that reads/writes tenant data must be scoped by `organizationId` (directly, or transitively via `propertyId`/`deviceId` joins) — never query across orgs.
- Service layer (`lib/services/*`) must have Vitest coverage for every exported function with business logic (pure CRUD passthroughs still get at least one happy-path test).
- UI pages are verified manually (run `npm run dev`, click through, confirm DB state) — no E2E test framework in v1, per project scope decision.
- No external notification services (LINE/email) in v1 — dashboard data is computed live on page load, not via a background job.
- No production deployment (Vercel/Neon/R2 wiring) in this plan — local-only, per project scope decision.
- File uploads (receipt/warranty photos) are stored as a URL string field in v1; actual object-storage (R2) wiring is a follow-up — the plan uses a local-disk stub for the upload so the field and UI are real and testable without needing live R2 credentials.

---

## Task 1: Project Scaffold

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `docker-compose.yml`, `.env.example`, `.gitignore`
- Create: `vitest.config.ts`
- Create: `tests/smoke.test.ts`
- Create: `app/layout.tsx`, `app/page.tsx`

**Interfaces:**
- Produces: a running Next.js dev server, a local Postgres instance reachable at `DATABASE_URL`, and a working `npm test` command that later tasks' tests plug into.

- [ ] **Step 1: Scaffold the Next.js app**

```bash
npx create-next-app@latest . --typescript --app --eslint --tailwind --src-dir=false --import-alias "@/*" --use-npm
```

Accept defaults when prompted (or pass `--yes` if your version supports it).

- [ ] **Step 2: Add dependencies**

```bash
npm install prisma @prisma/client next-auth@beta bcryptjs
npm install -D vitest @types/bcryptjs
```

- [ ] **Step 3: Add local Postgres via Docker**

Create `docker-compose.yml`:

```yaml
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_USER: maintenance
      POSTGRES_PASSWORD: maintenance
      POSTGRES_DB: maintenance_dev
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

Create `.env.example`:

```
DATABASE_URL="postgresql://maintenance:maintenance@localhost:5432/maintenance_dev"
AUTH_SECRET="replace-with-output-of-openssl-rand-base64-32"
```

Copy it to `.env` and generate a real secret:

```bash
cp .env.example .env
openssl rand -base64 32
```

Paste the generated value into `.env` as `AUTH_SECRET`. Then start Postgres:

```bash
docker compose up -d
```

- [ ] **Step 4: Add Vitest config**

Create `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
  },
})
```

Add scripts to `package.json`:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "test": "vitest run",
    "test:watch": "vitest",
    "db:migrate": "prisma migrate dev",
    "db:generate": "prisma generate"
  }
}
```

- [ ] **Step 5: Write the smoke test**

Create `tests/smoke.test.ts`:

```ts
import { describe, it, expect } from 'vitest'

describe('smoke', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2)
  })
})
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npm test`
Expected: PASS (1 test)

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js app with Vitest and local Postgres"
```

---

## Task 2: Tenancy Schema + Organization Service

**Files:**
- Create: `prisma/schema.prisma`
- Create: `lib/db.ts`
- Create: `lib/test-helpers/reset-db.ts`
- Create: `lib/services/organizations.ts`
- Test: `lib/services/organizations.test.ts`

**Interfaces:**
- Produces: `prisma` client singleton (`lib/db.ts`), `resetDb()` (`lib/test-helpers/reset-db.ts`), `createOrganizationWithOwner(params): Promise<Organization & { memberships: (Membership & { user: User })[] }>` (`lib/services/organizations.ts`).

- [ ] **Step 1: Write the Prisma schema for tenancy**

Create `prisma/schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum Role {
  ADMIN
  STAFF
}

model Organization {
  id          String       @id @default(cuid())
  name        String
  createdAt   DateTime     @default(now())
  memberships Membership[]

  @@map("organizations")
}

model User {
  id           String       @id @default(cuid())
  email        String       @unique
  passwordHash String
  name         String
  createdAt    DateTime     @default(now())
  memberships  Membership[]

  @@map("users")
}

model Membership {
  id             String       @id @default(cuid())
  role           Role
  userId         String
  organizationId String
  user           User         @relation(fields: [userId], references: [id])
  organization   Organization @relation(fields: [organizationId], references: [id])
  createdAt      DateTime     @default(now())

  @@unique([userId, organizationId])
  @@map("memberships")
}
```

- [ ] **Step 2: Run the migration**

Run: `npx prisma migrate dev --name tenancy`
Expected: migration applied, `Organization`, `User`, `Membership` tables created.

- [ ] **Step 3: Create the Prisma client singleton**

Create `lib/db.ts`:

```ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

- [ ] **Step 4: Create the test DB reset helper**

Create `lib/test-helpers/reset-db.ts`:

```ts
import { prisma } from '../db'

export async function resetDb() {
  await prisma.membership.deleteMany()
  await prisma.user.deleteMany()
  await prisma.organization.deleteMany()
}
```

- [ ] **Step 5: Write the failing test for organization creation**

Create `lib/services/organizations.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { resetDb } from '../test-helpers/reset-db'
import { createOrganizationWithOwner } from './organizations'

describe('createOrganizationWithOwner', () => {
  beforeEach(async () => {
    await resetDb()
  })

  it('creates an organization with one ADMIN membership', async () => {
    const org = await createOrganizationWithOwner({
      organizationName: 'Sunset Villas',
      ownerEmail: 'owner@example.com',
      ownerPassword: 'correct horse battery staple',
      ownerName: 'Owner Name',
    })

    expect(org.name).toBe('Sunset Villas')
    expect(org.memberships).toHaveLength(1)
    expect(org.memberships[0].role).toBe('ADMIN')
    expect(org.memberships[0].user.email).toBe('owner@example.com')
  })

  it('rejects a duplicate email', async () => {
    await createOrganizationWithOwner({
      organizationName: 'Org A',
      ownerEmail: 'dup@example.com',
      ownerPassword: 'password-one',
      ownerName: 'A',
    })

    await expect(
      createOrganizationWithOwner({
        organizationName: 'Org B',
        ownerEmail: 'dup@example.com',
        ownerPassword: 'password-two',
        ownerName: 'B',
      })
    ).rejects.toThrow()
  })
})
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npm test -- organizations`
Expected: FAIL with "Cannot find module './organizations'"

- [ ] **Step 7: Implement the organization service**

Create `lib/services/organizations.ts`:

```ts
import bcrypt from 'bcryptjs'
import { prisma } from '../db'

export async function createOrganizationWithOwner(params: {
  organizationName: string
  ownerEmail: string
  ownerPassword: string
  ownerName: string
}) {
  const passwordHash = await bcrypt.hash(params.ownerPassword, 10)

  return prisma.organization.create({
    data: {
      name: params.organizationName,
      memberships: {
        create: {
          role: 'ADMIN',
          user: {
            create: {
              email: params.ownerEmail,
              passwordHash,
              name: params.ownerName,
            },
          },
        },
      },
    },
    include: { memberships: { include: { user: true } } },
  })
}
```

- [ ] **Step 8: Run test to verify it passes**

Run: `npm test -- organizations`
Expected: PASS (2 tests)

- [ ] **Step 9: Commit**

```bash
git add prisma lib/db.ts lib/test-helpers lib/services/organizations.ts lib/services/organizations.test.ts
git commit -m "feat: add tenancy schema and organization signup service"
```

---

## Task 3: Auth.js + Org-Scoping Helpers

**Files:**
- Create: `lib/auth.ts`
- Create: `lib/auth-helpers.ts`
- Test: `lib/auth-helpers.test.ts`
- Create: `app/api/auth/[...nextauth]/route.ts`

**Interfaces:**
- Consumes: `prisma` from `lib/db.ts` (Task 2).
- Produces: `auth()`, `signIn()`, `signOut()`, `handlers` (`lib/auth.ts`); `requireSession()`, `requireOrgMembership(organizationId): Promise<{organizationId: string; role: 'ADMIN'|'STAFF'}>`, `requireOrgAdmin(organizationId)`, `getPrimaryOrganizationId(): Promise<string>`, `UnauthorizedError`, `ForbiddenError` (`lib/auth-helpers.ts`) — later tasks' UI/services use these for access control.

- [ ] **Step 1: Configure Auth.js with a Credentials provider**

Create `lib/auth.ts`:

```ts
import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from './db'

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const email = credentials?.email as string | undefined
        const password = credentials?.password as string | undefined
        if (!email || !password) return null

        const user = await prisma.user.findUnique({
          where: { email },
          include: { memberships: true },
        })
        if (!user) return null

        const valid = await bcrypt.compare(password, user.passwordHash)
        if (!valid) return null

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          memberships: user.memberships.map((m) => ({
            organizationId: m.organizationId,
            role: m.role,
          })),
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.memberships = (user as { memberships?: unknown }).memberships
      }
      return token
    },
    async session({ session, token }) {
      ;(session as { memberships?: unknown }).memberships = token.memberships
      return session
    },
  },
})
```

- [ ] **Step 2: Wire the Auth.js route handler**

Create `app/api/auth/[...nextauth]/route.ts`:

```ts
import { handlers } from '@/lib/auth'

export const { GET, POST } = handlers
```

- [ ] **Step 3: Write the failing tests for org-scoping helpers**

Create `lib/auth-helpers.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('./auth', () => ({
  auth: vi.fn(),
}))

import { auth } from './auth'
import {
  requireSession,
  requireOrgMembership,
  requireOrgAdmin,
  getPrimaryOrganizationId,
  UnauthorizedError,
  ForbiddenError,
} from './auth-helpers'

describe('auth-helpers', () => {
  beforeEach(() => {
    vi.mocked(auth).mockReset()
  })

  it('requireSession throws UnauthorizedError when no session', async () => {
    vi.mocked(auth).mockResolvedValue(null)
    await expect(requireSession()).rejects.toThrow(UnauthorizedError)
  })

  it('requireOrgMembership returns the matching membership', async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: 'u1' },
      memberships: [{ organizationId: 'org1', role: 'STAFF' }],
    } as never)

    const membership = await requireOrgMembership('org1')
    expect(membership.role).toBe('STAFF')
  })

  it('requireOrgMembership throws ForbiddenError when not a member', async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: 'u1' },
      memberships: [{ organizationId: 'org1', role: 'STAFF' }],
    } as never)

    await expect(requireOrgMembership('org2')).rejects.toThrow(ForbiddenError)
  })

  it('requireOrgAdmin throws ForbiddenError for STAFF role', async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: 'u1' },
      memberships: [{ organizationId: 'org1', role: 'STAFF' }],
    } as never)

    await expect(requireOrgAdmin('org1')).rejects.toThrow(ForbiddenError)
  })

  it('getPrimaryOrganizationId returns the first membership org', async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: 'u1' },
      memberships: [{ organizationId: 'org1', role: 'ADMIN' }],
    } as never)

    await expect(getPrimaryOrganizationId()).resolves.toBe('org1')
  })
})
```

- [ ] **Step 4: Run test to verify it fails**

Run: `npm test -- auth-helpers`
Expected: FAIL with "Cannot find module './auth-helpers'"

- [ ] **Step 5: Implement the org-scoping helpers**

Create `lib/auth-helpers.ts`:

```ts
import { auth } from './auth'

export class UnauthorizedError extends Error {}
export class ForbiddenError extends Error {}

type Membership = { organizationId: string; role: 'ADMIN' | 'STAFF' }
type SessionWithMemberships = { user?: unknown; memberships?: Membership[] }

export async function requireSession() {
  const session = (await auth()) as SessionWithMemberships | null
  if (!session?.user) throw new UnauthorizedError('Not signed in')
  return session
}

export async function requireOrgMembership(organizationId: string) {
  const session = await requireSession()
  const membership = session.memberships?.find((m) => m.organizationId === organizationId)
  if (!membership) throw new ForbiddenError('Not a member of this organization')
  return membership
}

export async function requireOrgAdmin(organizationId: string) {
  const membership = await requireOrgMembership(organizationId)
  if (membership.role !== 'ADMIN') throw new ForbiddenError('Admin role required')
  return membership
}

export async function getPrimaryOrganizationId() {
  const session = await requireSession()
  if (!session.memberships || session.memberships.length === 0) {
    throw new ForbiddenError('No organization membership')
  }
  return session.memberships[0].organizationId
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npm test -- auth-helpers`
Expected: PASS (5 tests)

- [ ] **Step 7: Commit**

```bash
git add lib/auth.ts lib/auth-helpers.ts lib/auth-helpers.test.ts app/api/auth
git commit -m "feat: add Auth.js credentials login and org-scoping helpers"
```

---

## Task 4: Signup & Login Pages

**Files:**
- Create: `app/(auth)/signup/actions.ts`
- Create: `app/(auth)/signup/page.tsx`
- Create: `app/(auth)/login/page.tsx`

**Interfaces:**
- Consumes: `createOrganizationWithOwner` (Task 2), `signIn` (Task 3).
- Produces: working `/signup` and `/login` routes for manual verification.

- [ ] **Step 1: Implement the signup server action**

Create `app/(auth)/signup/actions.ts`:

```ts
'use server'

import { redirect } from 'next/navigation'
import { createOrganizationWithOwner } from '@/lib/services/organizations'

export async function signupAction(formData: FormData) {
  const organizationName = String(formData.get('organizationName') ?? '')
  const ownerName = String(formData.get('ownerName') ?? '')
  const ownerEmail = String(formData.get('ownerEmail') ?? '')
  const ownerPassword = String(formData.get('ownerPassword') ?? '')

  if (!organizationName || !ownerName || !ownerEmail || !ownerPassword) {
    throw new Error('All fields are required')
  }

  await createOrganizationWithOwner({ organizationName, ownerEmail, ownerPassword, ownerName })
  redirect('/login')
}
```

- [ ] **Step 2: Implement the signup page**

Create `app/(auth)/signup/page.tsx`:

```tsx
import { signupAction } from './actions'

export default function SignupPage() {
  return (
    <form action={signupAction}>
      <h1>Create your organization</h1>
      <input name="organizationName" placeholder="Organization name" required />
      <input name="ownerName" placeholder="Your name" required />
      <input name="ownerEmail" type="email" placeholder="Email" required />
      <input name="ownerPassword" type="password" placeholder="Password" required minLength={8} />
      <button type="submit">Sign up</button>
    </form>
  )
}
```

- [ ] **Step 3: Implement the login page**

Create `app/(auth)/login/page.tsx`:

```tsx
import { signIn } from '@/lib/auth'

export default function LoginPage() {
  async function loginAction(formData: FormData) {
    'use server'
    await signIn('credentials', {
      email: formData.get('email'),
      password: formData.get('password'),
      redirectTo: '/dashboard',
    })
  }

  return (
    <form action={loginAction}>
      <h1>Log in</h1>
      <input name="email" type="email" placeholder="Email" required />
      <input name="password" type="password" placeholder="Password" required />
      <button type="submit">Log in</button>
    </form>
  )
}
```

- [ ] **Step 4: Manually verify**

Run: `npm run dev`
- Visit `http://localhost:3000/signup`, submit the form with a new org/email/password.
- Confirm redirect to `/login`.
- Log in with the same credentials, confirm redirect to `/dashboard` (page doesn't exist yet — a 404 here is expected and fine; the goal is confirming the session cookie is set. Check dev tools → Application → Cookies for an `authjs.session-token` cookie).

- [ ] **Step 5: Commit**

```bash
git add "app/(auth)"
git commit -m "feat: add signup and login pages"
```

---

## Task 5: Property + Location Schema and Services

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `lib/test-helpers/reset-db.ts`
- Create: `lib/services/properties.ts`
- Test: `lib/services/properties.test.ts`
- Create: `lib/similarity.ts`
- Test: `lib/similarity.test.ts`
- Create: `lib/services/locations.ts`
- Test: `lib/services/locations.test.ts`

**Interfaces:**
- Consumes: `prisma` (Task 2).
- Produces: `createProperty(params): Promise<Property>`, `listProperties(organizationId): Promise<Property[]>` (`lib/services/properties.ts`); `normalizedLevenshtein(a, b): number`, `findSimilarStrings(candidate, existing, threshold?): string[]` (`lib/similarity.ts`); `createLocation(params): Promise<Location>`, `listLocations(propertyId): Promise<Location[]>`, `ensureDefaultLocation(propertyId): Promise<Location>`, `SimilarLocationExistsError` (`lib/services/locations.ts`).

- [ ] **Step 1: Extend the Prisma schema**

In `prisma/schema.prisma`, add to `Organization`:

```prisma
model Organization {
  id          String       @id @default(cuid())
  name        String
  createdAt   DateTime     @default(now())
  memberships Membership[]
  properties  Property[]

  @@map("organizations")
}
```

Append new models:

```prisma
model Property {
  id             String       @id @default(cuid())
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id])
  name           String
  address        String
  type           String
  createdAt      DateTime     @default(now())
  locations      Location[]

  @@map("properties")
}

model Location {
  id         String   @id @default(cuid())
  propertyId String
  property   Property @relation(fields: [propertyId], references: [id])
  name       String
  createdAt  DateTime @default(now())

  @@unique([propertyId, name])
  @@map("locations")
}
```

- [ ] **Step 2: Run the migration**

Run: `npx prisma migrate dev --name properties_and_locations`
Expected: migration applied, `Property` and `Location` tables created.

- [ ] **Step 3: Update the test DB reset helper**

Modify `lib/test-helpers/reset-db.ts`:

```ts
import { prisma } from '../db'

export async function resetDb() {
  await prisma.location.deleteMany()
  await prisma.property.deleteMany()
  await prisma.membership.deleteMany()
  await prisma.user.deleteMany()
  await prisma.organization.deleteMany()
}
```

- [ ] **Step 4: Write the failing test for the similarity helper**

Create `lib/similarity.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { normalizedLevenshtein, findSimilarStrings } from './similarity'

describe('normalizedLevenshtein', () => {
  it('returns 1 for identical strings ignoring case/whitespace', () => {
    expect(normalizedLevenshtein('Room 101', ' room 101 ')).toBe(1)
  })

  it('returns a low score for very different strings', () => {
    expect(normalizedLevenshtein('Room 101', 'Pool Area')).toBeLessThan(0.5)
  })
})

describe('findSimilarStrings', () => {
  it('flags near-duplicate names above the threshold', () => {
    const result = findSimilarStrings('Room 101', ['room 101', 'Pool Area'])
    expect(result).toEqual(['room 101'])
  })

  it('excludes an exact case-insensitive match from results', () => {
    const result = findSimilarStrings('room 101', ['Room 101'])
    expect(result).toEqual(['Room 101'])
  })

  it('returns empty array when nothing is similar', () => {
    const result = findSimilarStrings('Lobby', ['Pool Area', 'Room 101'])
    expect(result).toEqual([])
  })
})
```

- [ ] **Step 5: Run test to verify it fails**

Run: `npm test -- similarity`
Expected: FAIL with "Cannot find module './similarity'"

- [ ] **Step 6: Implement the similarity helper**

Create `lib/similarity.ts`:

```ts
export function normalizedLevenshtein(a: string, b: string): number {
  const s1 = a.trim().toLowerCase()
  const s2 = b.trim().toLowerCase()
  if (s1 === s2) return 1
  const maxLen = Math.max(s1.length, s2.length)
  if (maxLen === 0) return 1

  const distances: number[][] = Array.from({ length: s1.length + 1 }, (_, i) =>
    Array.from({ length: s2.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  )

  for (let i = 1; i <= s1.length; i++) {
    for (let j = 1; j <= s2.length; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1
      distances[i][j] = Math.min(
        distances[i - 1][j] + 1,
        distances[i][j - 1] + 1,
        distances[i - 1][j - 1] + cost
      )
    }
  }

  const distance = distances[s1.length][s2.length]
  return 1 - distance / maxLen
}

export function findSimilarStrings(
  candidate: string,
  existing: string[],
  threshold = 0.75
): string[] {
  return existing.filter((s) => normalizedLevenshtein(candidate, s) >= threshold)
}
```

- [ ] **Step 7: Run test to verify it passes**

Run: `npm test -- similarity`
Expected: PASS (5 tests)

- [ ] **Step 8: Write the failing test for the property service**

Create `lib/services/properties.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { resetDb } from '../test-helpers/reset-db'
import { createOrganizationWithOwner } from './organizations'
import { createProperty, listProperties } from './properties'
import { listLocations } from './locations'

describe('properties', () => {
  beforeEach(async () => {
    await resetDb()
  })

  it('creates a property with a default "Whole Property" location', async () => {
    const org = await createOrganizationWithOwner({
      organizationName: 'Sunset Villas',
      ownerEmail: 'owner@example.com',
      ownerPassword: 'password123',
      ownerName: 'Owner',
    })

    const property = await createProperty({
      organizationId: org.id,
      name: 'Villa 1',
      address: '123 Beach Rd',
      type: 'villa',
    })

    expect(property.name).toBe('Villa 1')

    const locations = await listLocations(property.id)
    expect(locations.map((l) => l.name)).toEqual(['Whole Property'])
  })

  it('lists only properties for the given organization', async () => {
    const orgA = await createOrganizationWithOwner({
      organizationName: 'Org A',
      ownerEmail: 'a@example.com',
      ownerPassword: 'password123',
      ownerName: 'A',
    })
    const orgB = await createOrganizationWithOwner({
      organizationName: 'Org B',
      ownerEmail: 'b@example.com',
      ownerPassword: 'password123',
      ownerName: 'B',
    })

    await createProperty({ organizationId: orgA.id, name: 'A Property', address: 'x', type: 'hotel' })
    await createProperty({ organizationId: orgB.id, name: 'B Property', address: 'y', type: 'apartment' })

    const propertiesForA = await listProperties(orgA.id)
    expect(propertiesForA.map((p) => p.name)).toEqual(['A Property'])
  })
})
```

- [ ] **Step 9: Run test to verify it fails**

Run: `npm test -- properties`
Expected: FAIL with "Cannot find module './properties'"

- [ ] **Step 10: Implement the location service**

Create `lib/services/locations.ts`:

```ts
import { prisma } from '../db'
import { findSimilarStrings } from '../similarity'

export class SimilarLocationExistsError extends Error {
  constructor(public suggestions: string[]) {
    super(`Similar location name(s) already exist: ${suggestions.join(', ')}`)
    this.name = 'SimilarLocationExistsError'
  }
}

export async function listLocations(propertyId: string) {
  return prisma.location.findMany({ where: { propertyId }, orderBy: { name: 'asc' } })
}

export async function createLocation(params: {
  propertyId: string
  name: string
  force?: boolean
}) {
  const existing = await listLocations(params.propertyId)
  const existingNames = existing.map((l) => l.name)
  const trimmedName = params.name.trim()

  if (!params.force) {
    const similar = findSimilarStrings(trimmedName, existingNames).filter(
      (s) => s.toLowerCase() !== trimmedName.toLowerCase()
    )
    if (similar.length > 0) {
      throw new SimilarLocationExistsError(similar)
    }
  }

  return prisma.location.create({
    data: { propertyId: params.propertyId, name: trimmedName },
  })
}

export async function ensureDefaultLocation(propertyId: string) {
  const existing = await prisma.location.findFirst({
    where: { propertyId, name: 'Whole Property' },
  })
  if (existing) return existing
  return prisma.location.create({
    data: { propertyId, name: 'Whole Property' },
  })
}
```

- [ ] **Step 11: Implement the property service**

Create `lib/services/properties.ts`:

```ts
import { prisma } from '../db'
import { ensureDefaultLocation } from './locations'

export async function createProperty(params: {
  organizationId: string
  name: string
  address: string
  type: string
}) {
  const property = await prisma.property.create({
    data: {
      organizationId: params.organizationId,
      name: params.name,
      address: params.address,
      type: params.type,
    },
  })
  await ensureDefaultLocation(property.id)
  return property
}

export async function listProperties(organizationId: string) {
  return prisma.property.findMany({
    where: { organizationId },
    orderBy: { name: 'asc' },
  })
}
```

- [ ] **Step 12: Run test to verify it passes**

Run: `npm test -- properties`
Expected: PASS (2 tests)

- [ ] **Step 13: Write the failing test for the location service's dedup behavior**

Create `lib/services/locations.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { resetDb } from '../test-helpers/reset-db'
import { createOrganizationWithOwner } from './organizations'
import { createProperty } from './properties'
import { createLocation, listLocations, SimilarLocationExistsError } from './locations'

describe('locations', () => {
  let propertyId: string

  beforeEach(async () => {
    await resetDb()
    const org = await createOrganizationWithOwner({
      organizationName: 'Sunset Villas',
      ownerEmail: 'owner@example.com',
      ownerPassword: 'password123',
      ownerName: 'Owner',
    })
    const property = await createProperty({
      organizationId: org.id,
      name: 'Villa 1',
      address: '123 Beach Rd',
      type: 'villa',
    })
    propertyId = property.id
  })

  it('creates a new, distinct location', async () => {
    const location = await createLocation({ propertyId, name: 'Pool Area' })
    expect(location.name).toBe('Pool Area')
  })

  it('throws SimilarLocationExistsError for a near-duplicate name', async () => {
    await createLocation({ propertyId, name: 'Room 101' })

    await expect(createLocation({ propertyId, name: 'room101' })).rejects.toThrow(
      SimilarLocationExistsError
    )
  })

  it('allows a near-duplicate when force is true', async () => {
    await createLocation({ propertyId, name: 'Room 101' })
    const forced = await createLocation({ propertyId, name: 'room101', force: true })
    expect(forced.name).toBe('room101')

    const all = await listLocations(propertyId)
    expect(all.map((l) => l.name).sort()).toEqual(['Room 101', 'Whole Property', 'room101'].sort())
  })
})
```

- [ ] **Step 14: Run test to verify it fails**

Run: `npm test -- locations`
Expected: FAIL — `SimilarLocationExistsError` case fails because `createLocation` behavior hasn't been exercised yet against real fuzzy matches (module exists from Step 10, but run this before Step 10 in practice is not applicable — since Step 10 already implemented it, this test should mostly pass immediately; if the fuzzy-duplicate case fails, adjust the threshold in `findSimilarStrings` usage).

- [ ] **Step 15: Run test to verify it passes**

Run: `npm test -- locations`
Expected: PASS (3 tests)

- [ ] **Step 16: Commit**

```bash
git add prisma lib/test-helpers/reset-db.ts lib/services/properties.ts lib/services/properties.test.ts \
  lib/similarity.ts lib/similarity.test.ts lib/services/locations.ts lib/services/locations.test.ts
git commit -m "feat: add properties and locations with fuzzy-duplicate detection"
```

---

## Task 6: Properties & Locations UI

**Files:**
- Create: `app/(app)/properties/actions.ts`
- Create: `app/(app)/properties/page.tsx`
- Create: `app/(app)/properties/[propertyId]/page.tsx`
- Create: `app/(app)/properties/[propertyId]/actions.ts`

**Interfaces:**
- Consumes: `getPrimaryOrganizationId`, `requireOrgMembership` (Task 3); `createProperty`, `listProperties` (Task 5); `createLocation`, `listLocations`, `SimilarLocationExistsError` (Task 5).
- Produces: `/properties` list+create page, `/properties/[propertyId]` detail page with location management, for manual verification and for later UI tasks to link into.

- [ ] **Step 1: Implement the properties list/create server action and page**

Create `app/(app)/properties/actions.ts`:

```ts
'use server'

import { revalidatePath } from 'next/cache'
import { getPrimaryOrganizationId } from '@/lib/auth-helpers'
import { createProperty } from '@/lib/services/properties'

export async function createPropertyAction(formData: FormData) {
  const organizationId = await getPrimaryOrganizationId()
  const name = String(formData.get('name') ?? '')
  const address = String(formData.get('address') ?? '')
  const type = String(formData.get('type') ?? '')

  if (!name || !address || !type) throw new Error('All fields are required')

  await createProperty({ organizationId, name, address, type })
  revalidatePath('/properties')
}
```

Create `app/(app)/properties/page.tsx`:

```tsx
import Link from 'next/link'
import { getPrimaryOrganizationId } from '@/lib/auth-helpers'
import { listProperties } from '@/lib/services/properties'
import { createPropertyAction } from './actions'

export default async function PropertiesPage() {
  const organizationId = await getPrimaryOrganizationId()
  const properties = await listProperties(organizationId)

  return (
    <div>
      <h1>Properties</h1>
      <ul>
        {properties.map((p) => (
          <li key={p.id}>
            <Link href={`/properties/${p.id}`}>
              {p.name} ({p.type})
            </Link>
          </li>
        ))}
      </ul>

      <form action={createPropertyAction}>
        <h2>Add property</h2>
        <input name="name" placeholder="Name" required />
        <input name="address" placeholder="Address" required />
        <input name="type" placeholder="Type (hotel/apartment/villa)" required />
        <button type="submit">Create</button>
      </form>
    </div>
  )
}
```

- [ ] **Step 2: Implement the property detail page with location management**

Create `app/(app)/properties/[propertyId]/actions.ts`:

```ts
'use server'

import { revalidatePath } from 'next/cache'
import { createLocation, SimilarLocationExistsError } from '@/lib/services/locations'

export async function createLocationAction(propertyId: string, formData: FormData) {
  const name = String(formData.get('name') ?? '')
  const force = formData.get('force') === 'true'
  if (!name) throw new Error('Name is required')

  try {
    await createLocation({ propertyId, name, force })
  } catch (error) {
    if (error instanceof SimilarLocationExistsError) {
      throw new Error(
        `${error.message}. Resubmit with force=true to add it anyway.`
      )
    }
    throw error
  }

  revalidatePath(`/properties/${propertyId}`)
}
```

Create `app/(app)/properties/[propertyId]/page.tsx`:

```tsx
import { listLocations } from '@/lib/services/locations'
import { createLocationAction } from './actions'

export default async function PropertyDetailPage({
  params,
}: {
  params: Promise<{ propertyId: string }>
}) {
  const { propertyId } = await params
  const locations = await listLocations(propertyId)
  const boundAction = createLocationAction.bind(null, propertyId)

  return (
    <div>
      <h1>Locations</h1>
      <ul>
        {locations.map((l) => (
          <li key={l.id}>{l.name}</li>
        ))}
      </ul>

      <form action={boundAction}>
        <input name="name" placeholder="New location name" required />
        <button type="submit">Add location</button>
      </form>
    </div>
  )
}
```

- [ ] **Step 3: Manually verify**

Run: `npm run dev`
- Log in (Task 4), visit `/properties`, create a property.
- Click into the property, add a location ("Pool Area") — confirm it appears.
- Try adding a near-duplicate ("pool area") — confirm an error is thrown (visible as a Next.js error overlay in dev, which is acceptable for v1's manual verification; polished error UI is a fast-follow).

- [ ] **Step 4: Commit**

```bash
git add "app/(app)/properties"
git commit -m "feat: add properties and locations UI"
```

---

## Task 7: Device Schema and Service

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `lib/test-helpers/reset-db.ts`
- Create: `lib/services/devices.ts`
- Test: `lib/services/devices.test.ts`

**Interfaces:**
- Consumes: `prisma` (Task 2), `createProperty` (Task 5), `createLocation`/`listLocations` (Task 5).
- Produces: `createDevice(params): Promise<Device>`, `listDevices(propertyId, opts?): Promise<Device[]>`, `getDeviceWithHistory(deviceId): Promise<Device | null>`, `warrantyStatus(device, now?): 'none'|'active'|'expiring_soon'|'expired'`, `computeWarrantyExpiresAt(purchaseDate, warrantyMonths): Date | null` (`lib/services/devices.ts`) — Task 8 (replacement) and Task 15 (dashboard) both import from here.

- [ ] **Step 1: Extend the Prisma schema**

In `prisma/schema.prisma`, add `devices Device[]` to both `Property` and `Location`, then append:

```prisma
model Device {
  id                String    @id @default(cuid())
  propertyId        String
  property          Property  @relation(fields: [propertyId], references: [id])
  locationId        String
  location          Location  @relation(fields: [locationId], references: [id])
  category          String
  brand             String
  model             String
  purchaseDate      DateTime?
  purchaseVendor    String?
  warrantyMonths    Int?
  warrantyExpiresAt DateTime?
  receiptPhotoUrl   String?
  notes             String?
  archivedAt        DateTime?
  replacesDeviceId  String?   @unique
  replacesDevice    Device?   @relation("DeviceReplacement", fields: [replacesDeviceId], references: [id])
  replacedByDevice  Device?   @relation("DeviceReplacement")
  createdAt         DateTime  @default(now())

  @@map("devices")
}
```

- [ ] **Step 2: Run the migration**

Run: `npx prisma migrate dev --name devices`
Expected: migration applied, `Device` table created.

- [ ] **Step 3: Update the test DB reset helper**

Modify `lib/test-helpers/reset-db.ts`:

```ts
import { prisma } from '../db'

export async function resetDb() {
  await prisma.device.deleteMany()
  await prisma.location.deleteMany()
  await prisma.property.deleteMany()
  await prisma.membership.deleteMany()
  await prisma.user.deleteMany()
  await prisma.organization.deleteMany()
}
```

- [ ] **Step 4: Write the failing tests for the device service**

Create `lib/services/devices.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { resetDb } from '../test-helpers/reset-db'
import { createOrganizationWithOwner } from './organizations'
import { createProperty } from './properties'
import { listLocations } from './locations'
import { createDevice, listDevices, getDeviceWithHistory, warrantyStatus } from './devices'

describe('devices', () => {
  let propertyId: string
  let locationId: string

  beforeEach(async () => {
    await resetDb()
    const org = await createOrganizationWithOwner({
      organizationName: 'Sunset Villas',
      ownerEmail: 'owner@example.com',
      ownerPassword: 'password123',
      ownerName: 'Owner',
    })
    const property = await createProperty({
      organizationId: org.id,
      name: 'Villa 1',
      address: '123 Beach Rd',
      type: 'villa',
    })
    propertyId = property.id
    const locations = await listLocations(propertyId)
    locationId = locations[0].id
  })

  it('creates a device and computes warrantyExpiresAt from purchaseDate + warrantyMonths', async () => {
    const device = await createDevice({
      propertyId,
      locationId,
      category: 'Doorlock',
      brand: 'Samsung',
      model: 'SHP-DP728',
      purchaseDate: new Date('2026-01-01'),
      warrantyMonths: 12,
    })

    expect(device.warrantyExpiresAt).toEqual(new Date('2027-01-01'))
  })

  it('lists only non-archived devices for a property by default', async () => {
    const device = await createDevice({
      propertyId,
      locationId,
      category: 'Doorlock',
      brand: 'Samsung',
      model: 'SHP-DP728',
    })

    const devices = await listDevices(propertyId)
    expect(devices.map((d) => d.id)).toEqual([device.id])
  })

  it('getDeviceWithHistory returns the device with its location', async () => {
    const device = await createDevice({
      propertyId,
      locationId,
      category: 'AC',
      brand: 'Daikin',
      model: 'FTKF25',
    })

    const withHistory = await getDeviceWithHistory(device.id)
    expect(withHistory?.location.id).toBe(locationId)
  })
})

describe('warrantyStatus', () => {
  it('returns "none" when there is no warrantyExpiresAt', () => {
    expect(warrantyStatus({ warrantyExpiresAt: null })).toBe('none')
  })

  it('returns "expired" when warrantyExpiresAt is in the past', () => {
    const now = new Date('2026-06-01')
    expect(warrantyStatus({ warrantyExpiresAt: new Date('2026-05-01') }, now)).toBe('expired')
  })

  it('returns "expiring_soon" within 30 days of expiry', () => {
    const now = new Date('2026-06-01')
    expect(warrantyStatus({ warrantyExpiresAt: new Date('2026-06-15') }, now)).toBe('expiring_soon')
  })

  it('returns "active" when expiry is more than 30 days away', () => {
    const now = new Date('2026-06-01')
    expect(warrantyStatus({ warrantyExpiresAt: new Date('2026-12-01') }, now)).toBe('active')
  })
})
```

- [ ] **Step 5: Run test to verify it fails**

Run: `npm test -- devices`
Expected: FAIL with "Cannot find module './devices'"

- [ ] **Step 6: Implement the device service**

Create `lib/services/devices.ts`:

```ts
import { prisma } from '../db'

export function computeWarrantyExpiresAt(
  purchaseDate: Date | null | undefined,
  warrantyMonths: number | null | undefined
): Date | null {
  if (!purchaseDate || !warrantyMonths) return null
  const expires = new Date(purchaseDate)
  expires.setMonth(expires.getMonth() + warrantyMonths)
  return expires
}

export async function createDevice(params: {
  propertyId: string
  locationId: string
  category: string
  brand: string
  model: string
  purchaseDate?: Date
  purchaseVendor?: string
  warrantyMonths?: number
  receiptPhotoUrl?: string
  notes?: string
}) {
  return prisma.device.create({
    data: {
      propertyId: params.propertyId,
      locationId: params.locationId,
      category: params.category,
      brand: params.brand,
      model: params.model,
      purchaseDate: params.purchaseDate ?? null,
      purchaseVendor: params.purchaseVendor ?? null,
      warrantyMonths: params.warrantyMonths ?? null,
      warrantyExpiresAt: computeWarrantyExpiresAt(params.purchaseDate, params.warrantyMonths),
      receiptPhotoUrl: params.receiptPhotoUrl ?? null,
      notes: params.notes ?? null,
    },
  })
}

export async function listDevices(propertyId: string, opts: { includeArchived?: boolean } = {}) {
  return prisma.device.findMany({
    where: {
      propertyId,
      ...(opts.includeArchived ? {} : { archivedAt: null }),
    },
    orderBy: { createdAt: 'desc' },
  })
}

export async function getDeviceWithHistory(deviceId: string) {
  return prisma.device.findUnique({
    where: { id: deviceId },
    include: {
      location: true,
      replacesDevice: true,
      replacedByDevice: true,
    },
  })
}

export function warrantyStatus(
  device: { warrantyExpiresAt: Date | null },
  now: Date = new Date()
): 'none' | 'active' | 'expiring_soon' | 'expired' {
  if (!device.warrantyExpiresAt) return 'none'
  const daysUntilExpiry = Math.ceil(
    (device.warrantyExpiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  )
  if (daysUntilExpiry < 0) return 'expired'
  if (daysUntilExpiry <= 30) return 'expiring_soon'
  return 'active'
}
```

- [ ] **Step 7: Run test to verify it passes**

Run: `npm test -- devices`
Expected: PASS (7 tests)

- [ ] **Step 8: Commit**

```bash
git add prisma lib/test-helpers/reset-db.ts lib/services/devices.ts lib/services/devices.test.ts
git commit -m "feat: add device schema and service with warranty status computation"
```

---

## Task 8: Device Replacement Service

**Files:**
- Create: `lib/services/device-replacement.ts`
- Test: `lib/services/device-replacement.test.ts`

**Interfaces:**
- Consumes: `prisma` (Task 2), `computeWarrantyExpiresAt` (Task 7).
- Produces: `replaceDevice(params): Promise<Device>` (`lib/services/device-replacement.ts`) — Task 9 UI uses this.

- [ ] **Step 1: Write the failing test**

Create `lib/services/device-replacement.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { resetDb } from '../test-helpers/reset-db'
import { createOrganizationWithOwner } from './organizations'
import { createProperty } from './properties'
import { listLocations } from './locations'
import { createDevice, getDeviceWithHistory } from './devices'
import { replaceDevice } from './device-replacement'

describe('replaceDevice', () => {
  let propertyId: string
  let locationId: string

  beforeEach(async () => {
    await resetDb()
    const org = await createOrganizationWithOwner({
      organizationName: 'Sunset Villas',
      ownerEmail: 'owner@example.com',
      ownerPassword: 'password123',
      ownerName: 'Owner',
    })
    const property = await createProperty({
      organizationId: org.id,
      name: 'Villa 1',
      address: '123 Beach Rd',
      type: 'villa',
    })
    propertyId = property.id
    locationId = (await listLocations(propertyId))[0].id
  })

  it('archives the old device and links the new one', async () => {
    const oldDevice = await createDevice({
      propertyId,
      locationId,
      category: 'Doorlock',
      brand: 'Samsung',
      model: 'SHP-DP728',
    })

    const newDevice = await replaceDevice({
      oldDeviceId: oldDevice.id,
      newDevice: {
        propertyId,
        locationId,
        category: 'Doorlock',
        brand: 'Yale',
        model: 'YDM4109A',
        purchaseDate: new Date('2026-06-01'),
        warrantyMonths: 24,
      },
    })

    expect(newDevice.replacesDeviceId).toBe(oldDevice.id)
    expect(newDevice.warrantyExpiresAt).toEqual(new Date('2028-06-01'))

    const oldWithHistory = await getDeviceWithHistory(oldDevice.id)
    expect(oldWithHistory?.archivedAt).not.toBeNull()

    const newWithHistory = await getDeviceWithHistory(newDevice.id)
    expect(newWithHistory?.replacesDevice?.id).toBe(oldDevice.id)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- device-replacement`
Expected: FAIL with "Cannot find module './device-replacement'"

- [ ] **Step 3: Implement the replacement service**

Create `lib/services/device-replacement.ts`:

```ts
import { prisma } from '../db'
import { computeWarrantyExpiresAt } from './devices'

export async function replaceDevice(params: {
  oldDeviceId: string
  newDevice: {
    propertyId: string
    locationId: string
    category: string
    brand: string
    model: string
    purchaseDate?: Date
    purchaseVendor?: string
    warrantyMonths?: number
    receiptPhotoUrl?: string
    notes?: string
  }
}) {
  return prisma.$transaction(async (tx) => {
    await tx.device.update({
      where: { id: params.oldDeviceId },
      data: { archivedAt: new Date() },
    })

    return tx.device.create({
      data: {
        propertyId: params.newDevice.propertyId,
        locationId: params.newDevice.locationId,
        category: params.newDevice.category,
        brand: params.newDevice.brand,
        model: params.newDevice.model,
        purchaseDate: params.newDevice.purchaseDate ?? null,
        purchaseVendor: params.newDevice.purchaseVendor ?? null,
        warrantyMonths: params.newDevice.warrantyMonths ?? null,
        warrantyExpiresAt: computeWarrantyExpiresAt(
          params.newDevice.purchaseDate,
          params.newDevice.warrantyMonths
        ),
        receiptPhotoUrl: params.newDevice.receiptPhotoUrl ?? null,
        notes: params.newDevice.notes ?? null,
        replacesDeviceId: params.oldDeviceId,
      },
    })
  })
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- device-replacement`
Expected: PASS (1 test)

- [ ] **Step 5: Commit**

```bash
git add lib/services/device-replacement.ts lib/services/device-replacement.test.ts
git commit -m "feat: add device replacement service (archive + link)"
```

---

## Task 9: Devices UI

**Files:**
- Create: `app/(app)/properties/[propertyId]/devices/actions.ts`
- Create: `app/(app)/properties/[propertyId]/devices/page.tsx`
- Modify: `app/(app)/properties/[propertyId]/page.tsx`

**Interfaces:**
- Consumes: `createDevice`, `listDevices`, `warrantyStatus` (Task 7); `listLocations` (Task 5).
- Produces: `/properties/[propertyId]/devices` list+create page for manual verification; a link from the property detail page.

- [ ] **Step 1: Implement the device create action**

Create `app/(app)/properties/[propertyId]/devices/actions.ts`:

```ts
'use server'

import { revalidatePath } from 'next/cache'
import { createDevice } from '@/lib/services/devices'

export async function createDeviceAction(propertyId: string, formData: FormData) {
  const locationId = String(formData.get('locationId') ?? '')
  const category = String(formData.get('category') ?? '')
  const brand = String(formData.get('brand') ?? '')
  const model = String(formData.get('model') ?? '')
  const purchaseDateRaw = String(formData.get('purchaseDate') ?? '')
  const warrantyMonthsRaw = String(formData.get('warrantyMonths') ?? '')

  if (!locationId || !category || !brand || !model) {
    throw new Error('Location, category, brand, and model are required')
  }

  await createDevice({
    propertyId,
    locationId,
    category,
    brand,
    model,
    purchaseDate: purchaseDateRaw ? new Date(purchaseDateRaw) : undefined,
    warrantyMonths: warrantyMonthsRaw ? Number(warrantyMonthsRaw) : undefined,
  })

  revalidatePath(`/properties/${propertyId}/devices`)
}
```

- [ ] **Step 2: Implement the devices page**

Create `app/(app)/properties/[propertyId]/devices/page.tsx`:

```tsx
import Link from 'next/link'
import { listDevices, warrantyStatus } from '@/lib/services/devices'
import { listLocations } from '@/lib/services/locations'
import { createDeviceAction } from './actions'

export default async function DevicesPage({
  params,
}: {
  params: Promise<{ propertyId: string }>
}) {
  const { propertyId } = await params
  const [devices, locations] = await Promise.all([
    listDevices(propertyId),
    listLocations(propertyId),
  ])
  const boundAction = createDeviceAction.bind(null, propertyId)

  return (
    <div>
      <h1>Devices</h1>
      <ul>
        {devices.map((d) => (
          <li key={d.id}>
            <Link href={`/devices/${d.id}`}>
              {d.category}: {d.brand} {d.model} — {warrantyStatus(d)}
            </Link>
          </li>
        ))}
      </ul>

      <form action={boundAction}>
        <h2>Add device</h2>
        <select name="locationId" required>
          {locations.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
        <input name="category" placeholder="Category (e.g. Doorlock)" required />
        <input name="brand" placeholder="Brand" required />
        <input name="model" placeholder="Model" required />
        <input name="purchaseDate" type="date" />
        <input name="warrantyMonths" type="number" placeholder="Warranty (months)" />
        <button type="submit">Add device</button>
      </form>
    </div>
  )
}
```

- [ ] **Step 3: Link to the devices page from the property detail page**

Modify `app/(app)/properties/[propertyId]/page.tsx`, add near the top of the returned JSX (right after the `<h1>Locations</h1>` opening):

```tsx
import Link from 'next/link'
```

And add this line right before `<h1>Locations</h1>`:

```tsx
<Link href={`/properties/${propertyId}/devices`}>View devices</Link>
```

- [ ] **Step 4: Manually verify**

Run: `npm run dev`
- Navigate to a property, click "View devices."
- Add a device with a purchase date and warranty months, confirm it appears with the correct warranty status label.
- Add a device with a purchase date far enough in the past that adding e.g. 1 month of warranty makes it "expired" — confirm the label reflects that.

- [ ] **Step 5: Commit**

```bash
git add "app/(app)/properties"
git commit -m "feat: add devices UI with warranty status display"
```

---

## Task 10: Vendor Schema, Service, and UI

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `lib/test-helpers/reset-db.ts`
- Create: `lib/services/vendors.ts`
- Test: `lib/services/vendors.test.ts`
- Create: `app/(app)/vendors/actions.ts`
- Create: `app/(app)/vendors/page.tsx`

**Interfaces:**
- Consumes: `prisma` (Task 2), `getPrimaryOrganizationId` (Task 3).
- Produces: `createVendor(params): Promise<Vendor>`, `listVendors(organizationId): Promise<Vendor[]>` (`lib/services/vendors.ts`) — Task 14 (repair tickets) links tickets to vendors by `vendorId`.

- [ ] **Step 1: Extend the Prisma schema**

Add `vendors Vendor[]` to `Organization`, then append:

```prisma
model Vendor {
  id             String       @id @default(cuid())
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id])
  name           String
  phone          String?
  line           String?
  email          String?
  specialty      String?
  notes          String?
  createdAt      DateTime     @default(now())

  @@map("vendors")
}
```

- [ ] **Step 2: Run the migration**

Run: `npx prisma migrate dev --name vendors`
Expected: migration applied, `Vendor` table created.

- [ ] **Step 3: Update the test DB reset helper**

Modify `lib/test-helpers/reset-db.ts`, add `await prisma.vendor.deleteMany()` as the first line inside `resetDb()`:

```ts
import { prisma } from '../db'

export async function resetDb() {
  await prisma.vendor.deleteMany()
  await prisma.device.deleteMany()
  await prisma.location.deleteMany()
  await prisma.property.deleteMany()
  await prisma.membership.deleteMany()
  await prisma.user.deleteMany()
  await prisma.organization.deleteMany()
}
```

- [ ] **Step 4: Write the failing test**

Create `lib/services/vendors.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { resetDb } from '../test-helpers/reset-db'
import { createOrganizationWithOwner } from './organizations'
import { createVendor, listVendors } from './vendors'

describe('vendors', () => {
  beforeEach(async () => {
    await resetDb()
  })

  it('creates and lists vendors scoped to an organization', async () => {
    const orgA = await createOrganizationWithOwner({
      organizationName: 'Org A',
      ownerEmail: 'a@example.com',
      ownerPassword: 'password123',
      ownerName: 'A',
    })
    const orgB = await createOrganizationWithOwner({
      organizationName: 'Org B',
      ownerEmail: 'b@example.com',
      ownerPassword: 'password123',
      ownerName: 'B',
    })

    await createVendor({ organizationId: orgA.id, name: 'Doorlock Fixers Co', specialty: 'doorlock' })
    await createVendor({ organizationId: orgB.id, name: 'AC Experts', specialty: 'AC' })

    const vendorsForA = await listVendors(orgA.id)
    expect(vendorsForA.map((v) => v.name)).toEqual(['Doorlock Fixers Co'])
  })
})
```

- [ ] **Step 5: Run test to verify it fails**

Run: `npm test -- vendors`
Expected: FAIL with "Cannot find module './vendors'"

- [ ] **Step 6: Implement the vendor service**

Create `lib/services/vendors.ts`:

```ts
import { prisma } from '../db'

export async function createVendor(params: {
  organizationId: string
  name: string
  phone?: string
  line?: string
  email?: string
  specialty?: string
  notes?: string
}) {
  return prisma.vendor.create({
    data: {
      organizationId: params.organizationId,
      name: params.name,
      phone: params.phone ?? null,
      line: params.line ?? null,
      email: params.email ?? null,
      specialty: params.specialty ?? null,
      notes: params.notes ?? null,
    },
  })
}

export async function listVendors(organizationId: string) {
  return prisma.vendor.findMany({
    where: { organizationId },
    orderBy: { name: 'asc' },
  })
}
```

- [ ] **Step 7: Run test to verify it passes**

Run: `npm test -- vendors`
Expected: PASS (1 test)

- [ ] **Step 8: Implement the vendors UI**

Create `app/(app)/vendors/actions.ts`:

```ts
'use server'

import { revalidatePath } from 'next/cache'
import { getPrimaryOrganizationId } from '@/lib/auth-helpers'
import { createVendor } from '@/lib/services/vendors'

export async function createVendorAction(formData: FormData) {
  const organizationId = await getPrimaryOrganizationId()
  const name = String(formData.get('name') ?? '')
  const phone = String(formData.get('phone') ?? '')
  const line = String(formData.get('line') ?? '')
  const specialty = String(formData.get('specialty') ?? '')

  if (!name) throw new Error('Name is required')

  await createVendor({
    organizationId,
    name,
    phone: phone || undefined,
    line: line || undefined,
    specialty: specialty || undefined,
  })

  revalidatePath('/vendors')
}
```

Create `app/(app)/vendors/page.tsx`:

```tsx
import { getPrimaryOrganizationId } from '@/lib/auth-helpers'
import { listVendors } from '@/lib/services/vendors'
import { createVendorAction } from './actions'

export default async function VendorsPage() {
  const organizationId = await getPrimaryOrganizationId()
  const vendors = await listVendors(organizationId)

  return (
    <div>
      <h1>Vendors</h1>
      <ul>
        {vendors.map((v) => (
          <li key={v.id}>
            {v.name} — {v.specialty} — {v.phone ?? v.line ?? 'no contact info'}
          </li>
        ))}
      </ul>

      <form action={createVendorAction}>
        <h2>Add vendor</h2>
        <input name="name" placeholder="Name" required />
        <input name="phone" placeholder="Phone" />
        <input name="line" placeholder="LINE ID" />
        <input name="specialty" placeholder="Specialty (e.g. doorlock repair)" />
        <button type="submit">Add vendor</button>
      </form>
    </div>
  )
}
```

- [ ] **Step 9: Manually verify**

Run: `npm run dev`
- Visit `/vendors`, add a vendor, confirm it appears in the list.

- [ ] **Step 10: Commit**

```bash
git add prisma lib/test-helpers/reset-db.ts lib/services/vendors.ts lib/services/vendors.test.ts "app/(app)/vendors"
git commit -m "feat: add vendor directory service and UI"
```

---

## Task 11: Maintenance Schedule Service

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `lib/test-helpers/reset-db.ts`
- Create: `lib/services/maintenance-schedules.ts`
- Test: `lib/services/maintenance-schedules.test.ts`

**Interfaces:**
- Consumes: `prisma` (Task 2).
- Produces: `createMaintenanceSchedule(params): Promise<MaintenanceSchedule>`, `recordCompletion(scheduleId, completedAt?): Promise<MaintenanceSchedule>`, `listSchedulesForDevice(deviceId): Promise<MaintenanceSchedule[]>`, `listDueSchedules(organizationId, withinDays?): Promise<(MaintenanceSchedule & {device: Device})[]>` (`lib/services/maintenance-schedules.ts`) — Task 15 (dashboard) uses `listDueSchedules`.

- [ ] **Step 1: Extend the Prisma schema**

Add `maintenanceSchedules MaintenanceSchedule[]` to `Device`, then append:

```prisma
model MaintenanceSchedule {
  id              String    @id @default(cuid())
  deviceId        String
  device          Device    @relation(fields: [deviceId], references: [id])
  taskDescription String
  intervalDays    Int
  lastCompletedAt DateTime?
  nextDueAt       DateTime
  createdAt       DateTime  @default(now())

  @@map("maintenance_schedules")
}
```

- [ ] **Step 2: Run the migration**

Run: `npx prisma migrate dev --name maintenance_schedules`
Expected: migration applied, `MaintenanceSchedule` table created.

- [ ] **Step 3: Update the test DB reset helper**

Modify `lib/test-helpers/reset-db.ts`, add `await prisma.maintenanceSchedule.deleteMany()` as the first line inside `resetDb()`.

- [ ] **Step 4: Write the failing test**

Create `lib/services/maintenance-schedules.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { resetDb } from '../test-helpers/reset-db'
import { createOrganizationWithOwner } from './organizations'
import { createProperty } from './properties'
import { listLocations } from './locations'
import { createDevice } from './devices'
import {
  createMaintenanceSchedule,
  recordCompletion,
  listDueSchedules,
} from './maintenance-schedules'

describe('maintenance schedules', () => {
  let organizationId: string
  let deviceId: string

  beforeEach(async () => {
    await resetDb()
    const org = await createOrganizationWithOwner({
      organizationName: 'Sunset Villas',
      ownerEmail: 'owner@example.com',
      ownerPassword: 'password123',
      ownerName: 'Owner',
    })
    organizationId = org.id
    const property = await createProperty({
      organizationId,
      name: 'Villa 1',
      address: '123 Beach Rd',
      type: 'villa',
    })
    const locationId = (await listLocations(property.id))[0].id
    const device = await createDevice({
      propertyId: property.id,
      locationId,
      category: 'AC',
      brand: 'Daikin',
      model: 'FTKF25',
    })
    deviceId = device.id
  })

  it('sets nextDueAt to startDate + intervalDays on creation', async () => {
    const schedule = await createMaintenanceSchedule({
      deviceId,
      taskDescription: 'Replace filter',
      intervalDays: 90,
      startDate: new Date('2026-01-01'),
    })

    expect(schedule.nextDueAt).toEqual(new Date('2026-04-01'))
  })

  it('recordCompletion advances nextDueAt by intervalDays from completedAt', async () => {
    const schedule = await createMaintenanceSchedule({
      deviceId,
      taskDescription: 'Replace filter',
      intervalDays: 90,
      startDate: new Date('2026-01-01'),
    })

    const updated = await recordCompletion(schedule.id, new Date('2026-04-05'))

    expect(updated.lastCompletedAt).toEqual(new Date('2026-04-05'))
    expect(updated.nextDueAt).toEqual(new Date('2026-07-04'))
  })

  it('listDueSchedules returns schedules due within the given window', async () => {
    const now = new Date()
    const soon = new Date(now)
    soon.setDate(soon.getDate() + 3)
    const far = new Date(now)
    far.setDate(far.getDate() + 60)

    await createMaintenanceSchedule({
      deviceId,
      taskDescription: 'Due soon',
      intervalDays: 90,
      startDate: new Date(soon.getTime() - 90 * 24 * 60 * 60 * 1000),
    })
    await createMaintenanceSchedule({
      deviceId,
      taskDescription: 'Due far',
      intervalDays: 90,
      startDate: new Date(far.getTime() - 90 * 24 * 60 * 60 * 1000),
    })

    const due = await listDueSchedules(organizationId, 7)
    expect(due.map((d) => d.taskDescription)).toEqual(['Due soon'])
  })
})
```

- [ ] **Step 5: Run test to verify it fails**

Run: `npm test -- maintenance-schedules`
Expected: FAIL with "Cannot find module './maintenance-schedules'"

- [ ] **Step 6: Implement the maintenance schedule service**

Create `lib/services/maintenance-schedules.ts`:

```ts
import { prisma } from '../db'

export async function createMaintenanceSchedule(params: {
  deviceId: string
  taskDescription: string
  intervalDays: number
  startDate?: Date
}) {
  const start = params.startDate ?? new Date()
  const nextDueAt = new Date(start)
  nextDueAt.setDate(nextDueAt.getDate() + params.intervalDays)

  return prisma.maintenanceSchedule.create({
    data: {
      deviceId: params.deviceId,
      taskDescription: params.taskDescription,
      intervalDays: params.intervalDays,
      nextDueAt,
    },
  })
}

export async function recordCompletion(scheduleId: string, completedAt: Date = new Date()) {
  const schedule = await prisma.maintenanceSchedule.findUniqueOrThrow({
    where: { id: scheduleId },
  })
  const nextDueAt = new Date(completedAt)
  nextDueAt.setDate(nextDueAt.getDate() + schedule.intervalDays)

  return prisma.maintenanceSchedule.update({
    where: { id: scheduleId },
    data: { lastCompletedAt: completedAt, nextDueAt },
  })
}

export async function listSchedulesForDevice(deviceId: string) {
  return prisma.maintenanceSchedule.findMany({
    where: { deviceId },
    orderBy: { nextDueAt: 'asc' },
  })
}

export async function listDueSchedules(organizationId: string, withinDays = 7) {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() + withinDays)

  return prisma.maintenanceSchedule.findMany({
    where: {
      nextDueAt: { lte: cutoff },
      device: { property: { organizationId }, archivedAt: null },
    },
    include: { device: true },
    orderBy: { nextDueAt: 'asc' },
  })
}
```

- [ ] **Step 7: Run test to verify it passes**

Run: `npm test -- maintenance-schedules`
Expected: PASS (3 tests)

- [ ] **Step 8: Commit**

```bash
git add prisma lib/test-helpers/reset-db.ts lib/services/maintenance-schedules.ts lib/services/maintenance-schedules.test.ts
git commit -m "feat: add maintenance schedule service with recurring due-date computation"
```

---

## Task 12: Maintenance Schedule UI

**Files:**
- Create: `app/(app)/devices/[deviceId]/actions.ts`
- Create: `app/(app)/devices/[deviceId]/page.tsx`

**Interfaces:**
- Consumes: `getDeviceWithHistory`, `warrantyStatus` (Task 7); `createMaintenanceSchedule`, `listSchedulesForDevice`, `recordCompletion` (Task 11).
- Produces: `/devices/[deviceId]` detail page (this is also the page linked from Task 9's devices list) showing device info + maintenance schedules; extended by Task 14 (repair tickets) and Task 17 (full history) in later tasks.

- [ ] **Step 1: Implement the device detail actions**

Create `app/(app)/devices/[deviceId]/actions.ts`:

```ts
'use server'

import { revalidatePath } from 'next/cache'
import { createMaintenanceSchedule, recordCompletion } from '@/lib/services/maintenance-schedules'

export async function createScheduleAction(deviceId: string, formData: FormData) {
  const taskDescription = String(formData.get('taskDescription') ?? '')
  const intervalDays = Number(formData.get('intervalDays') ?? '')

  if (!taskDescription || !intervalDays) {
    throw new Error('Task description and interval are required')
  }

  await createMaintenanceSchedule({ deviceId, taskDescription, intervalDays })
  revalidatePath(`/devices/${deviceId}`)
}

export async function completeScheduleAction(deviceId: string, scheduleId: string) {
  await recordCompletion(scheduleId)
  revalidatePath(`/devices/${deviceId}`)
}
```

- [ ] **Step 2: Implement the device detail page**

Create `app/(app)/devices/[deviceId]/page.tsx`:

```tsx
import { getDeviceWithHistory, warrantyStatus } from '@/lib/services/devices'
import { listSchedulesForDevice } from '@/lib/services/maintenance-schedules'
import { createScheduleAction, completeScheduleAction } from './actions'

export default async function DeviceDetailPage({
  params,
}: {
  params: Promise<{ deviceId: string }>
}) {
  const { deviceId } = await params
  const [device, schedules] = await Promise.all([
    getDeviceWithHistory(deviceId),
    listSchedulesForDevice(deviceId),
  ])

  if (!device) return <p>Device not found</p>

  const boundCreateSchedule = createScheduleAction.bind(null, deviceId)

  return (
    <div>
      <h1>
        {device.category}: {device.brand} {device.model}
      </h1>
      <p>Location: {device.location.name}</p>
      <p>Warranty: {warrantyStatus(device)}</p>

      <h2>Maintenance schedules</h2>
      <ul>
        {schedules.map((s) => (
          <li key={s.id}>
            {s.taskDescription} — next due {s.nextDueAt.toDateString()}
            <form action={completeScheduleAction.bind(null, deviceId, s.id)} style={{ display: 'inline' }}>
              <button type="submit">Mark complete</button>
            </form>
          </li>
        ))}
      </ul>

      <form action={boundCreateSchedule}>
        <h3>Add schedule</h3>
        <input name="taskDescription" placeholder="Task (e.g. Replace filter)" required />
        <input name="intervalDays" type="number" placeholder="Interval (days)" required />
        <button type="submit">Add</button>
      </form>
    </div>
  )
}
```

- [ ] **Step 3: Manually verify**

Run: `npm run dev`
- Navigate to a device (via `/properties/[propertyId]/devices`), add a maintenance schedule with a 90-day interval.
- Confirm "next due" date is ~90 days out.
- Click "Mark complete," confirm the next due date advances by 90 days from today.

- [ ] **Step 4: Commit**

```bash
git add "app/(app)/devices"
git commit -m "feat: add maintenance schedule UI on device detail page"
```

---

## Task 13: Repair Ticket Service

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `lib/test-helpers/reset-db.ts`
- Create: `lib/services/repair-tickets.ts`
- Test: `lib/services/repair-tickets.test.ts`

**Interfaces:**
- Consumes: `prisma` (Task 2).
- Produces: `createRepairTicket(params): Promise<RepairTicket>`, `transitionTicket(params): Promise<RepairTicket>`, `listTicketsForDevice(deviceId): Promise<RepairTicket[]>`, `countTicketsForDevice(deviceId): Promise<number>`, `listOpenTickets(organizationId): Promise<(RepairTicket & {device: Device})[]>` (`lib/services/repair-tickets.ts`) — Task 14 UI and Task 15 dashboard both depend on these.

- [ ] **Step 1: Extend the Prisma schema**

Add `repairTickets RepairTicket[]` to `Device` and `Vendor`, then append:

```prisma
enum TicketStatus {
  OPEN
  IN_PROGRESS
  RESOLVED
}

model RepairTicket {
  id                 String       @id @default(cuid())
  deviceId           String
  device             Device       @relation(fields: [deviceId], references: [id])
  status             TicketStatus @default(OPEN)
  problemDescription String
  vendorId           String?
  vendor             Vendor?      @relation(fields: [vendorId], references: [id])
  cost               Decimal?     @db.Decimal(10, 2)
  resolutionNotes    String?
  openedAt           DateTime     @default(now())
  resolvedAt         DateTime?

  @@map("repair_tickets")
}
```

- [ ] **Step 2: Run the migration**

Run: `npx prisma migrate dev --name repair_tickets`
Expected: migration applied, `RepairTicket` table created.

- [ ] **Step 3: Update the test DB reset helper**

Modify `lib/test-helpers/reset-db.ts`, add `await prisma.repairTicket.deleteMany()` as the first line inside `resetDb()`.

- [ ] **Step 4: Write the failing test**

Create `lib/services/repair-tickets.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { resetDb } from '../test-helpers/reset-db'
import { createOrganizationWithOwner } from './organizations'
import { createProperty } from './properties'
import { listLocations } from './locations'
import { createDevice } from './devices'
import {
  createRepairTicket,
  transitionTicket,
  listTicketsForDevice,
  countTicketsForDevice,
  listOpenTickets,
} from './repair-tickets'

describe('repair tickets', () => {
  let organizationId: string
  let deviceId: string

  beforeEach(async () => {
    await resetDb()
    const org = await createOrganizationWithOwner({
      organizationName: 'Sunset Villas',
      ownerEmail: 'owner@example.com',
      ownerPassword: 'password123',
      ownerName: 'Owner',
    })
    organizationId = org.id
    const property = await createProperty({
      organizationId,
      name: 'Villa 1',
      address: '123 Beach Rd',
      type: 'villa',
    })
    const locationId = (await listLocations(property.id))[0].id
    const device = await createDevice({
      propertyId: property.id,
      locationId,
      category: 'Doorlock',
      brand: 'Samsung',
      model: 'SHP-DP728',
    })
    deviceId = device.id
  })

  it('creates a ticket in OPEN status', async () => {
    const ticket = await createRepairTicket({
      deviceId,
      problemDescription: 'Battery drains fast',
    })
    expect(ticket.status).toBe('OPEN')
  })

  it('transitions a ticket to RESOLVED and stamps resolvedAt', async () => {
    const ticket = await createRepairTicket({
      deviceId,
      problemDescription: 'Battery drains fast',
    })

    const resolved = await transitionTicket({
      ticketId: ticket.id,
      status: 'RESOLVED',
      cost: 500,
      resolutionNotes: 'Replaced battery',
    })

    expect(resolved.status).toBe('RESOLVED')
    expect(resolved.resolvedAt).not.toBeNull()
    expect(Number(resolved.cost)).toBe(500)
  })

  it('counts and lists tickets for a device', async () => {
    await createRepairTicket({ deviceId, problemDescription: 'Issue 1' })
    await createRepairTicket({ deviceId, problemDescription: 'Issue 2' })

    expect(await countTicketsForDevice(deviceId)).toBe(2)
    const tickets = await listTicketsForDevice(deviceId)
    expect(tickets).toHaveLength(2)
  })

  it('lists only open/in-progress tickets across an organization', async () => {
    const t1 = await createRepairTicket({ deviceId, problemDescription: 'Open one' })
    const t2 = await createRepairTicket({ deviceId, problemDescription: 'Will be resolved' })
    await transitionTicket({ ticketId: t2.id, status: 'RESOLVED' })

    const open = await listOpenTickets(organizationId)
    expect(open.map((t) => t.id)).toEqual([t1.id])
  })
})
```

- [ ] **Step 5: Run test to verify it fails**

Run: `npm test -- repair-tickets`
Expected: FAIL with "Cannot find module './repair-tickets'"

- [ ] **Step 6: Implement the repair ticket service**

Create `lib/services/repair-tickets.ts`:

```ts
import { prisma } from '../db'

export async function createRepairTicket(params: {
  deviceId: string
  problemDescription: string
  vendorId?: string
}) {
  return prisma.repairTicket.create({
    data: {
      deviceId: params.deviceId,
      problemDescription: params.problemDescription,
      vendorId: params.vendorId ?? null,
      status: 'OPEN',
    },
  })
}

export async function transitionTicket(params: {
  ticketId: string
  status: 'IN_PROGRESS' | 'RESOLVED'
  cost?: number
  resolutionNotes?: string
}) {
  return prisma.repairTicket.update({
    where: { id: params.ticketId },
    data: {
      status: params.status,
      cost: params.cost,
      resolutionNotes: params.resolutionNotes,
      resolvedAt: params.status === 'RESOLVED' ? new Date() : undefined,
    },
  })
}

export async function listTicketsForDevice(deviceId: string) {
  return prisma.repairTicket.findMany({
    where: { deviceId },
    orderBy: { openedAt: 'desc' },
  })
}

export async function countTicketsForDevice(deviceId: string) {
  return prisma.repairTicket.count({ where: { deviceId } })
}

export async function listOpenTickets(organizationId: string) {
  return prisma.repairTicket.findMany({
    where: {
      status: { in: ['OPEN', 'IN_PROGRESS'] },
      device: { property: { organizationId } },
    },
    include: { device: true },
    orderBy: { openedAt: 'asc' },
  })
}
```

- [ ] **Step 7: Run test to verify it passes**

Run: `npm test -- repair-tickets`
Expected: PASS (4 tests)

- [ ] **Step 8: Commit**

```bash
git add prisma lib/test-helpers/reset-db.ts lib/services/repair-tickets.ts lib/services/repair-tickets.test.ts
git commit -m "feat: add repair ticket service with Open/In Progress/Resolved workflow"
```

---

## Task 14: Repair Ticket UI

**Files:**
- Modify: `app/(app)/devices/[deviceId]/actions.ts`
- Modify: `app/(app)/devices/[deviceId]/page.tsx`

**Interfaces:**
- Consumes: `createRepairTicket`, `transitionTicket`, `listTicketsForDevice`, `countTicketsForDevice` (Task 13).
- Produces: repair ticket section on the device detail page (`/devices/[deviceId]`), showing open/in-progress/resolved tickets and a repeat-repair count.

- [ ] **Step 1: Add repair ticket actions**

Modify `app/(app)/devices/[deviceId]/actions.ts`, add:

```ts
import { createRepairTicket, transitionTicket } from '@/lib/services/repair-tickets'

export async function createTicketAction(deviceId: string, formData: FormData) {
  const problemDescription = String(formData.get('problemDescription') ?? '')
  if (!problemDescription) throw new Error('Problem description is required')

  await createRepairTicket({ deviceId, problemDescription })
  revalidatePath(`/devices/${deviceId}`)
}

export async function transitionTicketAction(deviceId: string, ticketId: string, formData: FormData) {
  const status = String(formData.get('status') ?? '') as 'IN_PROGRESS' | 'RESOLVED'
  const costRaw = String(formData.get('cost') ?? '')
  const resolutionNotes = String(formData.get('resolutionNotes') ?? '')

  await transitionTicket({
    ticketId,
    status,
    cost: costRaw ? Number(costRaw) : undefined,
    resolutionNotes: resolutionNotes || undefined,
  })
  revalidatePath(`/devices/${deviceId}`)
}
```

- [ ] **Step 2: Add the repair ticket section to the device detail page**

Modify `app/(app)/devices/[deviceId]/page.tsx`. Update the imports and add a ticket section before the closing `</div>`:

```tsx
import { listTicketsForDevice, countTicketsForDevice } from '@/lib/services/repair-tickets'
import { createTicketAction, transitionTicketAction } from './actions'
```

Add to the `Promise.all` (change it to a 3-element array) and destructure a third value:

```tsx
const [device, schedules, tickets] = await Promise.all([
  getDeviceWithHistory(deviceId),
  listSchedulesForDevice(deviceId),
  listTicketsForDevice(deviceId),
])
```

Add, after the maintenance schedules section:

```tsx
<h2>Repair history ({tickets.length} total)</h2>
<ul>
  {tickets.map((t) => (
    <li key={t.id}>
      [{t.status}] {t.problemDescription}
      {t.status !== 'RESOLVED' && (
        <form action={transitionTicketAction.bind(null, deviceId, t.id)} style={{ display: 'inline' }}>
          <select name="status">
            <option value="IN_PROGRESS">In Progress</option>
            <option value="RESOLVED">Resolved</option>
          </select>
          <input name="cost" type="number" placeholder="Cost" />
          <input name="resolutionNotes" placeholder="Resolution notes" />
          <button type="submit">Update</button>
        </form>
      )}
    </li>
  ))}
</ul>

<form action={createTicketAction.bind(null, deviceId)}>
  <h3>Report a problem</h3>
  <input name="problemDescription" placeholder="What's wrong?" required />
  <button type="submit">Open ticket</button>
</form>
```

Note: `countTicketsForDevice` is imported for use in Task 17's cross-device reporting; the device detail page itself already shows the count via `tickets.length`.

- [ ] **Step 3: Manually verify**

Run: `npm run dev`
- On a device page, open a repair ticket, confirm it shows `[OPEN]`.
- Transition it to "Resolved" with a cost and note, confirm the status updates and the form for that ticket disappears (since it's resolved).
- Open two tickets for the same device, confirm the "Repair history (2 total)" count is correct.

- [ ] **Step 4: Commit**

```bash
git add "app/(app)/devices"
git commit -m "feat: add repair ticket workflow UI on device detail page"
```

---

## Task 15: Dashboard Service

**Files:**
- Create: `lib/services/dashboard.ts`
- Test: `lib/services/dashboard.test.ts`

**Interfaces:**
- Consumes: `listDueSchedules` (Task 11), `warrantyStatus` (Task 7), `listOpenTickets` (Task 13), `prisma` (Task 2).
- Produces: `getDashboard(organizationId): Promise<{dueSchedules, expiringWarranties, openTickets}>` (`lib/services/dashboard.ts`) — Task 16 UI consumes this.

- [ ] **Step 1: Write the failing test**

Create `lib/services/dashboard.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { resetDb } from '../test-helpers/reset-db'
import { createOrganizationWithOwner } from './organizations'
import { createProperty } from './properties'
import { listLocations } from './locations'
import { createDevice } from './devices'
import { createMaintenanceSchedule } from './maintenance-schedules'
import { createRepairTicket } from './repair-tickets'
import { getDashboard } from './dashboard'

describe('getDashboard', () => {
  let organizationId: string
  let deviceId: string
  let propertyId: string

  beforeEach(async () => {
    await resetDb()
    const org = await createOrganizationWithOwner({
      organizationName: 'Sunset Villas',
      ownerEmail: 'owner@example.com',
      ownerPassword: 'password123',
      ownerName: 'Owner',
    })
    organizationId = org.id
    const property = await createProperty({
      organizationId,
      name: 'Villa 1',
      address: '123 Beach Rd',
      type: 'villa',
    })
    propertyId = property.id
    const locationId = (await listLocations(propertyId))[0].id
    const device = await createDevice({
      propertyId,
      locationId,
      category: 'Doorlock',
      brand: 'Samsung',
      model: 'SHP-DP728',
      purchaseDate: new Date('2020-01-01'),
      warrantyMonths: 12,
    })
    deviceId = device.id
  })

  it('aggregates due schedules, expiring warranties, and open tickets', async () => {
    await createMaintenanceSchedule({
      deviceId,
      taskDescription: 'Replace battery',
      intervalDays: 1,
      startDate: new Date(),
    })
    await createRepairTicket({ deviceId, problemDescription: 'Sticky lock' })

    const dashboard = await getDashboard(organizationId)

    expect(dashboard.dueSchedules).toHaveLength(1)
    expect(dashboard.expiringWarranties.map((d) => d.id)).toEqual([deviceId])
    expect(dashboard.openTickets).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- dashboard`
Expected: FAIL with "Cannot find module './dashboard'"

- [ ] **Step 3: Implement the dashboard service**

Create `lib/services/dashboard.ts`:

```ts
import { prisma } from '../db'
import { listDueSchedules } from './maintenance-schedules'
import { listOpenTickets } from './repair-tickets'
import { warrantyStatus } from './devices'

export async function getDashboard(organizationId: string) {
  const [dueSchedules, devicesWithWarranty, openTickets] = await Promise.all([
    listDueSchedules(organizationId),
    prisma.device.findMany({
      where: {
        property: { organizationId },
        archivedAt: null,
        warrantyExpiresAt: { not: null },
      },
    }),
    listOpenTickets(organizationId),
  ])

  const expiringWarranties = devicesWithWarranty.filter((d) => {
    const status = warrantyStatus(d)
    return status === 'expiring_soon' || status === 'expired'
  })

  return { dueSchedules, expiringWarranties, openTickets }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- dashboard`
Expected: PASS (1 test)

- [ ] **Step 5: Commit**

```bash
git add lib/services/dashboard.ts lib/services/dashboard.test.ts
git commit -m "feat: add dashboard aggregation service"
```

---

## Task 16: Dashboard UI

**Files:**
- Create: `app/(app)/dashboard/page.tsx`

**Interfaces:**
- Consumes: `getPrimaryOrganizationId` (Task 3), `getDashboard` (Task 15).
- Produces: `/dashboard` page — the landing page users see after login (Task 4's login action already redirects here).

- [ ] **Step 1: Implement the dashboard page**

Create `app/(app)/dashboard/page.tsx`:

```tsx
import Link from 'next/link'
import { getPrimaryOrganizationId } from '@/lib/auth-helpers'
import { getDashboard } from '@/lib/services/dashboard'

export default async function DashboardPage() {
  const organizationId = await getPrimaryOrganizationId()
  const { dueSchedules, expiringWarranties, openTickets } = await getDashboard(organizationId)

  return (
    <div>
      <h1>Dashboard</h1>

      <h2>Maintenance due soon ({dueSchedules.length})</h2>
      <ul>
        {dueSchedules.map((s) => (
          <li key={s.id}>
            <Link href={`/devices/${s.deviceId}`}>
              {s.taskDescription} — {s.device.brand} {s.device.model} — due {s.nextDueAt.toDateString()}
            </Link>
          </li>
        ))}
      </ul>

      <h2>Warranties expiring/expired ({expiringWarranties.length})</h2>
      <ul>
        {expiringWarranties.map((d) => (
          <li key={d.id}>
            <Link href={`/devices/${d.id}`}>
              {d.brand} {d.model} — expires {d.warrantyExpiresAt?.toDateString()}
            </Link>
          </li>
        ))}
      </ul>

      <h2>Open repair tickets ({openTickets.length})</h2>
      <ul>
        {openTickets.map((t) => (
          <li key={t.id}>
            <Link href={`/devices/${t.deviceId}`}>
              [{t.status}] {t.device.brand} {t.device.model} — {t.problemDescription}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
```

- [ ] **Step 2: Manually verify**

Run: `npm run dev`
- Log in, confirm the dashboard shows counts matching what you created in earlier manual verification steps (due schedules, expiring warranties, open tickets).
- Click through each link and confirm it lands on the correct device page.

- [ ] **Step 3: Commit**

```bash
git add "app/(app)/dashboard"
git commit -m "feat: add dashboard UI"
```

---

## Task 17: Device Replacement UI + Full History View

**Files:**
- Create: `app/(app)/devices/[deviceId]/replace/actions.ts`
- Create: `app/(app)/devices/[deviceId]/replace/page.tsx`
- Modify: `app/(app)/devices/[deviceId]/page.tsx`

**Interfaces:**
- Consumes: `replaceDevice` (Task 8); `getDeviceWithHistory` (Task 7, already returns `replacesDevice`/`replacedByDevice`); `listLocations` (Task 5).
- Produces: `/devices/[deviceId]/replace` page; replacement chain display on the device detail page — this completes the v1 scope end-to-end.

- [ ] **Step 1: Implement the replacement action**

Create `app/(app)/devices/[deviceId]/replace/actions.ts`:

```ts
'use server'

import { redirect } from 'next/navigation'
import { replaceDevice } from '@/lib/services/device-replacement'

export async function replaceDeviceAction(
  oldDeviceId: string,
  propertyId: string,
  formData: FormData
) {
  const locationId = String(formData.get('locationId') ?? '')
  const category = String(formData.get('category') ?? '')
  const brand = String(formData.get('brand') ?? '')
  const model = String(formData.get('model') ?? '')
  const purchaseDateRaw = String(formData.get('purchaseDate') ?? '')
  const warrantyMonthsRaw = String(formData.get('warrantyMonths') ?? '')

  if (!locationId || !category || !brand || !model) {
    throw new Error('Location, category, brand, and model are required')
  }

  const newDevice = await replaceDevice({
    oldDeviceId,
    newDevice: {
      propertyId,
      locationId,
      category,
      brand,
      model,
      purchaseDate: purchaseDateRaw ? new Date(purchaseDateRaw) : undefined,
      warrantyMonths: warrantyMonthsRaw ? Number(warrantyMonthsRaw) : undefined,
    },
  })

  redirect(`/devices/${newDevice.id}`)
}
```

- [ ] **Step 2: Implement the replacement page**

Create `app/(app)/devices/[deviceId]/replace/page.tsx`:

```tsx
import { getDeviceWithHistory } from '@/lib/services/devices'
import { listLocations } from '@/lib/services/locations'
import { replaceDeviceAction } from './actions'

export default async function ReplaceDevicePage({
  params,
}: {
  params: Promise<{ deviceId: string }>
}) {
  const { deviceId } = await params
  const device = await getDeviceWithHistory(deviceId)
  if (!device) return <p>Device not found</p>

  const locations = await listLocations(device.propertyId)
  const boundAction = replaceDeviceAction.bind(null, deviceId, device.propertyId)

  return (
    <div>
      <h1>
        Replace {device.brand} {device.model}
      </h1>
      <form action={boundAction}>
        <select name="locationId" defaultValue={device.locationId} required>
          {locations.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
        <input name="category" defaultValue={device.category} required />
        <input name="brand" placeholder="New brand" required />
        <input name="model" placeholder="New model" required />
        <input name="purchaseDate" type="date" />
        <input name="warrantyMonths" type="number" placeholder="Warranty (months)" />
        <button type="submit">Replace device</button>
      </form>
    </div>
  )
}
```

- [ ] **Step 3: Show the replacement chain and a "Replace" link on the device detail page**

Modify `app/(app)/devices/[deviceId]/page.tsx`. Add near the top of the returned JSX, right after the `<p>Warranty: ...</p>` line:

```tsx
{!device.archivedAt && (
  <p>
    <a href={`/devices/${deviceId}/replace`}>Replace this device</a>
  </p>
)}
{device.archivedAt && <p>This device was archived on {device.archivedAt.toDateString()}.</p>}
{device.replacesDevice && (
  <p>
    Replaces:{' '}
    <a href={`/devices/${device.replacesDevice.id}`}>
      {device.replacesDevice.brand} {device.replacesDevice.model}
    </a>
  </p>
)}
{device.replacedByDevice && (
  <p>
    Replaced by:{' '}
    <a href={`/devices/${device.replacedByDevice.id}`}>
      {device.replacedByDevice.brand} {device.replacedByDevice.model}
    </a>
  </p>
)}
```

- [ ] **Step 4: Manually verify**

Run: `npm run dev`
- On an active device's page, click "Replace this device," fill in a new brand/model, submit.
- Confirm you land on the new device's page, and it shows "Replaces: <old brand/model>" linking back.
- Navigate to the old device's page, confirm it shows "This device was archived on ..." and "Replaced by: <new brand/model>" linking forward.
- Confirm the old device no longer appears in the property's devices list (Task 9), since `listDevices` excludes archived devices by default.

- [ ] **Step 5: Commit**

```bash
git add "app/(app)/devices"
git commit -m "feat: add device replacement UI and replacement chain display"
```

---

## Task 18: Staff Invite Service and UI

**Files:**
- Create: `lib/services/staff.ts`
- Test: `lib/services/staff.test.ts`
- Create: `app/(app)/staff/actions.ts`
- Create: `app/(app)/staff/page.tsx`

**Interfaces:**
- Consumes: `prisma` (Task 2), `requireOrgAdmin`, `getPrimaryOrganizationId` (Task 3).
- Produces: `inviteStaffMember(params): Promise<Membership & {user: User}>`, `listStaff(organizationId): Promise<(Membership & {user: User})[]>` (`lib/services/staff.ts`). This closes the "staff invites with Admin/Staff roles" item from the design doc's V1 scope, which earlier tasks only partially covered (org signup creates the first ADMIN, but no flow adds further staff).

- [ ] **Step 1: Write the failing test**

Create `lib/services/staff.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { resetDb } from '../test-helpers/reset-db'
import { createOrganizationWithOwner } from './organizations'
import { inviteStaffMember, listStaff } from './staff'

describe('staff', () => {
  let organizationId: string

  beforeEach(async () => {
    await resetDb()
    const org = await createOrganizationWithOwner({
      organizationName: 'Sunset Villas',
      ownerEmail: 'owner@example.com',
      ownerPassword: 'password123',
      ownerName: 'Owner',
    })
    organizationId = org.id
  })

  it('invites a staff member with STAFF role by default', async () => {
    const membership = await inviteStaffMember({
      organizationId,
      email: 'staff@example.com',
      name: 'Staff Member',
      temporaryPassword: 'temp-password-1',
    })

    expect(membership.role).toBe('STAFF')
    expect(membership.user.email).toBe('staff@example.com')
  })

  it('rejects inviting a duplicate email within the same organization', async () => {
    await inviteStaffMember({
      organizationId,
      email: 'dup@example.com',
      name: 'First',
      temporaryPassword: 'temp-password-1',
    })

    await expect(
      inviteStaffMember({
        organizationId,
        email: 'dup@example.com',
        name: 'Second',
        temporaryPassword: 'temp-password-2',
      })
    ).rejects.toThrow()
  })

  it('lists all staff for an organization including the owner', async () => {
    await inviteStaffMember({
      organizationId,
      email: 'staff@example.com',
      name: 'Staff Member',
      temporaryPassword: 'temp-password-1',
    })

    const staff = await listStaff(organizationId)
    expect(staff.map((m) => m.user.email).sort()).toEqual(
      ['owner@example.com', 'staff@example.com'].sort()
    )
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- staff`
Expected: FAIL with "Cannot find module './staff'"

- [ ] **Step 3: Implement the staff service**

Create `lib/services/staff.ts`:

```ts
import bcrypt from 'bcryptjs'
import { prisma } from '../db'

export async function inviteStaffMember(params: {
  organizationId: string
  email: string
  name: string
  temporaryPassword: string
  role?: 'ADMIN' | 'STAFF'
}) {
  const passwordHash = await bcrypt.hash(params.temporaryPassword, 10)

  return prisma.membership.create({
    data: {
      organizationId: params.organizationId,
      role: params.role ?? 'STAFF',
      user: {
        create: {
          email: params.email,
          name: params.name,
          passwordHash,
        },
      },
    },
    include: { user: true },
  })
}

export async function listStaff(organizationId: string) {
  return prisma.membership.findMany({
    where: { organizationId },
    include: { user: true },
    orderBy: { createdAt: 'asc' },
  })
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- staff`
Expected: PASS (3 tests)

- [ ] **Step 5: Implement the staff UI, gated to admins**

Create `app/(app)/staff/actions.ts`:

```ts
'use server'

import { revalidatePath } from 'next/cache'
import { getPrimaryOrganizationId, requireOrgAdmin } from '@/lib/auth-helpers'
import { inviteStaffMember } from '@/lib/services/staff'

export async function inviteStaffAction(formData: FormData) {
  const organizationId = await getPrimaryOrganizationId()
  await requireOrgAdmin(organizationId)

  const email = String(formData.get('email') ?? '')
  const name = String(formData.get('name') ?? '')
  const temporaryPassword = String(formData.get('temporaryPassword') ?? '')
  const role = String(formData.get('role') ?? 'STAFF') as 'ADMIN' | 'STAFF'

  if (!email || !name || !temporaryPassword) {
    throw new Error('Email, name, and temporary password are required')
  }

  await inviteStaffMember({ organizationId, email, name, temporaryPassword, role })
  revalidatePath('/staff')
}
```

Create `app/(app)/staff/page.tsx`:

```tsx
import { getPrimaryOrganizationId, requireOrgAdmin } from '@/lib/auth-helpers'
import { listStaff } from '@/lib/services/staff'
import { inviteStaffAction } from './actions'

export default async function StaffPage() {
  const organizationId = await getPrimaryOrganizationId()
  await requireOrgAdmin(organizationId)
  const staff = await listStaff(organizationId)

  return (
    <div>
      <h1>Staff</h1>
      <ul>
        {staff.map((m) => (
          <li key={m.id}>
            {m.user.name} ({m.user.email}) — {m.role}
          </li>
        ))}
      </ul>

      <form action={inviteStaffAction}>
        <h2>Invite staff member</h2>
        <input name="name" placeholder="Name" required />
        <input name="email" type="email" placeholder="Email" required />
        <input name="temporaryPassword" type="password" placeholder="Temporary password" required minLength={8} />
        <select name="role">
          <option value="STAFF">Staff</option>
          <option value="ADMIN">Admin</option>
        </select>
        <button type="submit">Invite</button>
      </form>
    </div>
  )
}
```

Note: v1 has no email delivery, so the admin must share the temporary password with the invited staff member out-of-band (e.g. verbally or via LINE) — consistent with the design doc's "in-app only, no LINE/email push" v1 constraint.

- [ ] **Step 6: Manually verify**

Run: `npm run dev`
- Log in as the org owner (ADMIN), visit `/staff`, invite a staff member.
- Log out, log in as the new staff account using the temporary password, confirm login succeeds.
- Log back in as the ADMIN and confirm the staff list shows both accounts with correct roles.

- [ ] **Step 7: Commit**

```bash
git add lib/services/staff.ts lib/services/staff.test.ts "app/(app)/staff"
git commit -m "feat: add staff invite service and admin-only staff management UI"
```

---

## Task 19: Edit Support for Properties, Locations, Devices, and Vendors

**Files:**
- Modify: `lib/services/properties.ts`
- Modify: `lib/services/locations.ts`
- Modify: `lib/services/devices.ts`
- Modify: `lib/services/vendors.ts`
- Test: `lib/services/properties.test.ts`, `lib/services/locations.test.ts`, `lib/services/devices.test.ts`, `lib/services/vendors.test.ts`
- Create: `app/(app)/properties/[propertyId]/edit/actions.ts`
- Create: `app/(app)/properties/[propertyId]/edit/page.tsx`
- Create: `app/(app)/devices/[deviceId]/edit/actions.ts`
- Create: `app/(app)/devices/[deviceId]/edit/page.tsx`
- Modify: `app/(app)/vendors/actions.ts`
- Modify: `app/(app)/vendors/page.tsx`

**Interfaces:**
- Produces: `updateProperty(params): Promise<Property>` (`lib/services/properties.ts`), `renameLocation(params): Promise<Location>` (`lib/services/locations.ts`), `updateDevice(params): Promise<Device>` (`lib/services/devices.ts`), `updateVendor(params): Promise<Vendor>` and `deleteVendor(vendorId): Promise<void>` (`lib/services/vendors.ts`). This completes the "Property CRUD" / "Device CRUD" items from the design doc's V1 scope, which earlier tasks covered only as create+list.

- [ ] **Step 1: Add and test `updateProperty`**

Append to `lib/services/properties.test.ts`, inside the existing `describe('properties', ...)` block:

```ts
  it('updates only the provided fields', async () => {
    const org = await createOrganizationWithOwner({
      organizationName: 'Org C',
      ownerEmail: 'c@example.com',
      ownerPassword: 'password123',
      ownerName: 'C',
    })
    const property = await createProperty({
      organizationId: org.id,
      name: 'Old Name',
      address: 'Old Address',
      type: 'hotel',
    })

    const updated = await updateProperty({ propertyId: property.id, name: 'New Name' })

    expect(updated.name).toBe('New Name')
    expect(updated.address).toBe('Old Address')
  })
```

Update the import line at the top of `lib/services/properties.test.ts` to also bring in `updateProperty`:

```ts
import { createProperty, listProperties, updateProperty } from './properties'
```

Run: `npm test -- properties`
Expected: FAIL with "updateProperty is not a function"

Append to `lib/services/properties.ts`:

```ts
export async function updateProperty(params: {
  propertyId: string
  name?: string
  address?: string
  type?: string
}) {
  return prisma.property.update({
    where: { id: params.propertyId },
    data: {
      ...(params.name !== undefined && { name: params.name }),
      ...(params.address !== undefined && { address: params.address }),
      ...(params.type !== undefined && { type: params.type }),
    },
  })
}
```

Run: `npm test -- properties`
Expected: PASS (3 tests)

- [ ] **Step 2: Add and test `renameLocation`**

Append to `lib/services/locations.test.ts`, inside the existing `describe('locations', ...)` block:

```ts
  it('renames a location, checking for fuzzy duplicates against other locations', async () => {
    const room = await createLocation({ propertyId, name: 'Room 101' })
    await createLocation({ propertyId, name: 'Pool Area' })

    const renamed = await renameLocation({ locationId: room.id, name: 'Room 102' })
    expect(renamed.name).toBe('Room 102')
  })

  it('rejects a rename that collides with another existing location', async () => {
    const room = await createLocation({ propertyId, name: 'Room 101' })
    await createLocation({ propertyId, name: 'Pool Area' })

    await expect(renameLocation({ locationId: room.id, name: 'pool area' })).rejects.toThrow(
      SimilarLocationExistsError
    )
  })
```

Update the import line at the top of `lib/services/locations.test.ts`:

```ts
import { createLocation, listLocations, renameLocation, SimilarLocationExistsError } from './locations'
```

Run: `npm test -- locations`
Expected: FAIL with "renameLocation is not a function"

Append to `lib/services/locations.ts`:

```ts
export async function renameLocation(params: {
  locationId: string
  name: string
  force?: boolean
}) {
  const location = await prisma.location.findUniqueOrThrow({ where: { id: params.locationId } })
  const others = (await listLocations(location.propertyId)).filter((l) => l.id !== params.locationId)
  const trimmedName = params.name.trim()

  if (!params.force) {
    const similar = findSimilarStrings(
      trimmedName,
      others.map((l) => l.name)
    )
    if (similar.length > 0) {
      throw new SimilarLocationExistsError(similar)
    }
  }

  return prisma.location.update({
    where: { id: params.locationId },
    data: { name: trimmedName },
  })
}
```

Run: `npm test -- locations`
Expected: PASS (5 tests)

- [ ] **Step 3: Add and test `updateDevice`**

Append to `lib/services/devices.test.ts`, inside the `describe('devices', ...)` block:

```ts
  it('updates fields and recomputes warrantyExpiresAt when purchase info changes', async () => {
    const device = await createDevice({
      propertyId,
      locationId,
      category: 'AC',
      brand: 'Daikin',
      model: 'FTKF25',
      purchaseDate: new Date('2026-01-01'),
      warrantyMonths: 12,
    })

    const updated = await updateDevice({
      deviceId: device.id,
      purchaseDate: new Date('2026-02-01'),
      warrantyMonths: 24,
    })

    expect(updated.warrantyExpiresAt).toEqual(new Date('2028-02-01'))
  })
```

Update the import line at the top of `lib/services/devices.test.ts`:

```ts
import { createDevice, listDevices, getDeviceWithHistory, warrantyStatus, updateDevice } from './devices'
```

Run: `npm test -- devices`
Expected: FAIL with "updateDevice is not a function"

Append to `lib/services/devices.ts`:

```ts
export async function updateDevice(params: {
  deviceId: string
  locationId?: string
  category?: string
  brand?: string
  model?: string
  purchaseDate?: Date
  purchaseVendor?: string
  warrantyMonths?: number
  receiptPhotoUrl?: string
  notes?: string
}) {
  const existing = await prisma.device.findUniqueOrThrow({ where: { id: params.deviceId } })

  const purchaseDate = params.purchaseDate ?? existing.purchaseDate ?? undefined
  const warrantyMonths = params.warrantyMonths ?? existing.warrantyMonths ?? undefined

  return prisma.device.update({
    where: { id: params.deviceId },
    data: {
      ...(params.locationId !== undefined && { locationId: params.locationId }),
      ...(params.category !== undefined && { category: params.category }),
      ...(params.brand !== undefined && { brand: params.brand }),
      ...(params.model !== undefined && { model: params.model }),
      ...(params.purchaseDate !== undefined && { purchaseDate: params.purchaseDate }),
      ...(params.purchaseVendor !== undefined && { purchaseVendor: params.purchaseVendor }),
      ...(params.warrantyMonths !== undefined && { warrantyMonths: params.warrantyMonths }),
      ...(params.receiptPhotoUrl !== undefined && { receiptPhotoUrl: params.receiptPhotoUrl }),
      ...(params.notes !== undefined && { notes: params.notes }),
      warrantyExpiresAt: computeWarrantyExpiresAt(purchaseDate, warrantyMonths),
    },
  })
}
```

Run: `npm test -- devices`
Expected: PASS (8 tests)

- [ ] **Step 4: Add and test `updateVendor` and `deleteVendor`**

Append to `lib/services/vendors.test.ts`, inside the existing `describe('vendors', ...)` block:

```ts
  it('updates and deletes a vendor', async () => {
    const org = await createOrganizationWithOwner({
      organizationName: 'Org D',
      ownerEmail: 'd@example.com',
      ownerPassword: 'password123',
      ownerName: 'D',
    })
    const vendor = await createVendor({ organizationId: org.id, name: 'Old Name' })

    const updated = await updateVendor({ vendorId: vendor.id, name: 'New Name' })
    expect(updated.name).toBe('New Name')

    await deleteVendor(vendor.id)
    const remaining = await listVendors(org.id)
    expect(remaining).toHaveLength(0)
  })
```

Update the import line at the top of `lib/services/vendors.test.ts`:

```ts
import { createVendor, listVendors, updateVendor, deleteVendor } from './vendors'
```

Run: `npm test -- vendors`
Expected: FAIL with "updateVendor is not a function"

Append to `lib/services/vendors.ts`:

```ts
export async function updateVendor(params: {
  vendorId: string
  name?: string
  phone?: string
  line?: string
  email?: string
  specialty?: string
  notes?: string
}) {
  return prisma.vendor.update({
    where: { id: params.vendorId },
    data: {
      ...(params.name !== undefined && { name: params.name }),
      ...(params.phone !== undefined && { phone: params.phone }),
      ...(params.line !== undefined && { line: params.line }),
      ...(params.email !== undefined && { email: params.email }),
      ...(params.specialty !== undefined && { specialty: params.specialty }),
      ...(params.notes !== undefined && { notes: params.notes }),
    },
  })
}

export async function deleteVendor(vendorId: string) {
  await prisma.vendor.delete({ where: { id: vendorId } })
}
```

Run: `npm test -- vendors`
Expected: PASS (2 tests)

- [ ] **Step 5: Add the property edit UI**

Create `app/(app)/properties/[propertyId]/edit/actions.ts`:

```ts
'use server'

import { redirect } from 'next/navigation'
import { updateProperty } from '@/lib/services/properties'

export async function updatePropertyAction(propertyId: string, formData: FormData) {
  const name = String(formData.get('name') ?? '')
  const address = String(formData.get('address') ?? '')
  const type = String(formData.get('type') ?? '')

  await updateProperty({
    propertyId,
    name: name || undefined,
    address: address || undefined,
    type: type || undefined,
  })

  redirect(`/properties/${propertyId}`)
}
```

Create `app/(app)/properties/[propertyId]/edit/page.tsx`:

```tsx
import { listProperties } from '@/lib/services/properties'
import { getPrimaryOrganizationId } from '@/lib/auth-helpers'
import { updatePropertyAction } from './actions'

export default async function EditPropertyPage({
  params,
}: {
  params: Promise<{ propertyId: string }>
}) {
  const { propertyId } = await params
  const organizationId = await getPrimaryOrganizationId()
  const property = (await listProperties(organizationId)).find((p) => p.id === propertyId)
  if (!property) return <p>Property not found</p>

  const boundAction = updatePropertyAction.bind(null, propertyId)

  return (
    <form action={boundAction}>
      <h1>Edit property</h1>
      <input name="name" defaultValue={property.name} required />
      <input name="address" defaultValue={property.address} required />
      <input name="type" defaultValue={property.type} required />
      <button type="submit">Save</button>
    </form>
  )
}
```

- [ ] **Step 6: Add the device edit UI**

Create `app/(app)/devices/[deviceId]/edit/actions.ts`:

```ts
'use server'

import { redirect } from 'next/navigation'
import { updateDevice } from '@/lib/services/devices'

export async function updateDeviceAction(deviceId: string, formData: FormData) {
  const brand = String(formData.get('brand') ?? '')
  const model = String(formData.get('model') ?? '')
  const notes = String(formData.get('notes') ?? '')
  const purchaseDateRaw = String(formData.get('purchaseDate') ?? '')
  const warrantyMonthsRaw = String(formData.get('warrantyMonths') ?? '')

  await updateDevice({
    deviceId,
    brand: brand || undefined,
    model: model || undefined,
    notes: notes || undefined,
    purchaseDate: purchaseDateRaw ? new Date(purchaseDateRaw) : undefined,
    warrantyMonths: warrantyMonthsRaw ? Number(warrantyMonthsRaw) : undefined,
  })

  redirect(`/devices/${deviceId}`)
}
```

Create `app/(app)/devices/[deviceId]/edit/page.tsx`:

```tsx
import { getDeviceWithHistory } from '@/lib/services/devices'
import { updateDeviceAction } from './actions'

export default async function EditDevicePage({
  params,
}: {
  params: Promise<{ deviceId: string }>
}) {
  const { deviceId } = await params
  const device = await getDeviceWithHistory(deviceId)
  if (!device) return <p>Device not found</p>

  const boundAction = updateDeviceAction.bind(null, deviceId)

  return (
    <form action={boundAction}>
      <h1>Edit device</h1>
      <input name="brand" defaultValue={device.brand} required />
      <input name="model" defaultValue={device.model} required />
      <input
        name="purchaseDate"
        type="date"
        defaultValue={device.purchaseDate?.toISOString().slice(0, 10)}
      />
      <input name="warrantyMonths" type="number" defaultValue={device.warrantyMonths ?? undefined} />
      <textarea name="notes" defaultValue={device.notes ?? ''} />
      <button type="submit">Save</button>
    </form>
  )
}
```

- [ ] **Step 7: Add edit/delete controls to the vendors UI**

Modify `app/(app)/vendors/actions.ts`, append:

```ts
import { updateVendor, deleteVendor } from '@/lib/services/vendors'

export async function updateVendorAction(vendorId: string, formData: FormData) {
  const name = String(formData.get('name') ?? '')
  const phone = String(formData.get('phone') ?? '')
  const specialty = String(formData.get('specialty') ?? '')

  await updateVendor({
    vendorId,
    name: name || undefined,
    phone: phone || undefined,
    specialty: specialty || undefined,
  })
  revalidatePath('/vendors')
}

export async function deleteVendorAction(vendorId: string) {
  await deleteVendor(vendorId)
  revalidatePath('/vendors')
}
```

Modify `app/(app)/vendors/page.tsx`. Update the import line:

```tsx
import { createVendorAction, updateVendorAction, deleteVendorAction } from './actions'
```

Replace the `<ul>` block with:

```tsx
<ul>
  {vendors.map((v) => (
    <li key={v.id}>
      <form action={updateVendorAction.bind(null, v.id)} style={{ display: 'inline' }}>
        <input name="name" defaultValue={v.name} />
        <input name="phone" defaultValue={v.phone ?? ''} />
        <input name="specialty" defaultValue={v.specialty ?? ''} />
        <button type="submit">Save</button>
      </form>
      <form action={deleteVendorAction.bind(null, v.id)} style={{ display: 'inline' }}>
        <button type="submit">Delete</button>
      </form>
    </li>
  ))}
</ul>
```

- [ ] **Step 8: Manually verify**

Run: `npm run dev`
- Edit a property's name via `/properties/[propertyId]/edit`, confirm the change shows on `/properties`.
- Edit a device's brand/model/notes via `/devices/[deviceId]/edit`, confirm changes show on the device detail page.
- On `/vendors`, edit a vendor's phone number inline and save, confirm it updates; delete a vendor, confirm it disappears from the list.

- [ ] **Step 9: Commit**

```bash
git add lib/services/properties.ts lib/services/properties.test.ts \
  lib/services/locations.ts lib/services/locations.test.ts \
  lib/services/devices.ts lib/services/devices.test.ts \
  lib/services/vendors.ts lib/services/vendors.test.ts \
  "app/(app)/properties" "app/(app)/devices" "app/(app)/vendors"
git commit -m "feat: add edit support for properties, locations, devices, and vendors"
```

---

## Task 20: Authorization Guards for Property/Device-Scoped Pages

**Files:**
- Modify: `lib/auth-helpers.ts`
- Test: `lib/auth-helpers.test.ts`
- Modify: `app/(app)/properties/[propertyId]/page.tsx`
- Modify: `app/(app)/properties/[propertyId]/actions.ts`
- Modify: `app/(app)/properties/[propertyId]/devices/page.tsx`
- Modify: `app/(app)/properties/[propertyId]/devices/actions.ts`
- Modify: `app/(app)/properties/[propertyId]/edit/page.tsx`
- Modify: `app/(app)/properties/[propertyId]/edit/actions.ts`
- Modify: `app/(app)/devices/[deviceId]/page.tsx`
- Modify: `app/(app)/devices/[deviceId]/actions.ts`
- Modify: `app/(app)/devices/[deviceId]/edit/page.tsx`
- Modify: `app/(app)/devices/[deviceId]/edit/actions.ts`
- Modify: `app/(app)/devices/[deviceId]/replace/page.tsx`
- Modify: `app/(app)/devices/[deviceId]/replace/actions.ts`

**Interfaces:**
- Consumes: `requireOrgMembership` (Task 3), `prisma` (Task 2).
- Produces: `requirePropertyAccess(propertyId): Promise<Property>`, `requireDeviceAccess(deviceId): Promise<Device & {property: Property}>` (`lib/auth-helpers.ts`). Every existing property-scoped and device-scoped page/action from Tasks 6, 9, 12, 14, 17, and 19 is retrofitted to call one of these before touching data, closing the gap where a `propertyId`/`deviceId` taken directly from the URL was never checked against the signed-in user's organization membership — a direct violation of this plan's Global Constraints ("every service function ... must be scoped by organizationId ... never query across orgs").

- [ ] **Step 1: Write the failing tests for the new guards**

Append to `lib/auth-helpers.test.ts`. First, extend the top-level mock setup — replace the existing `vi.mock('./auth', ...)` block and imports with:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { resetDb } from './test-helpers/reset-db'
import { createOrganizationWithOwner } from './services/organizations'
import { createProperty } from './services/properties'
import { listLocations } from './services/locations'
import { createDevice } from './services/devices'

vi.mock('./auth', () => ({
  auth: vi.fn(),
}))

import { auth } from './auth'
import {
  requireSession,
  requireOrgMembership,
  requireOrgAdmin,
  getPrimaryOrganizationId,
  requirePropertyAccess,
  requireDeviceAccess,
  UnauthorizedError,
  ForbiddenError,
} from './auth-helpers'
```

Then append two new `describe` blocks at the end of the file:

```ts
describe('requirePropertyAccess', () => {
  beforeEach(async () => {
    await resetDb()
    vi.mocked(auth).mockReset()
  })

  it('returns the property when the session belongs to its organization', async () => {
    const org = await createOrganizationWithOwner({
      organizationName: 'Sunset Villas',
      ownerEmail: 'owner@example.com',
      ownerPassword: 'password123',
      ownerName: 'Owner',
    })
    const property = await createProperty({
      organizationId: org.id,
      name: 'Villa 1',
      address: '123 Beach Rd',
      type: 'villa',
    })

    vi.mocked(auth).mockResolvedValue({
      user: { id: 'u1' },
      memberships: [{ organizationId: org.id, role: 'STAFF' }],
    } as never)

    const result = await requirePropertyAccess(property.id)
    expect(result.id).toBe(property.id)
  })

  it('throws ForbiddenError when the session belongs to a different organization', async () => {
    const orgA = await createOrganizationWithOwner({
      organizationName: 'Org A',
      ownerEmail: 'a@example.com',
      ownerPassword: 'password123',
      ownerName: 'A',
    })
    const orgB = await createOrganizationWithOwner({
      organizationName: 'Org B',
      ownerEmail: 'b@example.com',
      ownerPassword: 'password123',
      ownerName: 'B',
    })
    const property = await createProperty({
      organizationId: orgA.id,
      name: 'Villa 1',
      address: '123 Beach Rd',
      type: 'villa',
    })

    vi.mocked(auth).mockResolvedValue({
      user: { id: 'u1' },
      memberships: [{ organizationId: orgB.id, role: 'STAFF' }],
    } as never)

    await expect(requirePropertyAccess(property.id)).rejects.toThrow(ForbiddenError)
  })
})

describe('requireDeviceAccess', () => {
  beforeEach(async () => {
    await resetDb()
    vi.mocked(auth).mockReset()
  })

  it('returns the device when the session belongs to its property\'s organization', async () => {
    const org = await createOrganizationWithOwner({
      organizationName: 'Sunset Villas',
      ownerEmail: 'owner2@example.com',
      ownerPassword: 'password123',
      ownerName: 'Owner',
    })
    const property = await createProperty({
      organizationId: org.id,
      name: 'Villa 1',
      address: '123 Beach Rd',
      type: 'villa',
    })
    const locationId = (await listLocations(property.id))[0].id
    const device = await createDevice({
      propertyId: property.id,
      locationId,
      category: 'Doorlock',
      brand: 'Samsung',
      model: 'SHP-DP728',
    })

    vi.mocked(auth).mockResolvedValue({
      user: { id: 'u1' },
      memberships: [{ organizationId: org.id, role: 'STAFF' }],
    } as never)

    const result = await requireDeviceAccess(device.id)
    expect(result.id).toBe(device.id)
  })

  it('throws ForbiddenError when the session belongs to a different organization', async () => {
    const orgA = await createOrganizationWithOwner({
      organizationName: 'Org C',
      ownerEmail: 'c@example.com',
      ownerPassword: 'password123',
      ownerName: 'C',
    })
    const orgB = await createOrganizationWithOwner({
      organizationName: 'Org D',
      ownerEmail: 'd@example.com',
      ownerPassword: 'password123',
      ownerName: 'D',
    })
    const property = await createProperty({
      organizationId: orgA.id,
      name: 'Villa 1',
      address: '123 Beach Rd',
      type: 'villa',
    })
    const locationId = (await listLocations(property.id))[0].id
    const device = await createDevice({
      propertyId: property.id,
      locationId,
      category: 'Doorlock',
      brand: 'Samsung',
      model: 'SHP-DP728',
    })

    vi.mocked(auth).mockResolvedValue({
      user: { id: 'u1' },
      memberships: [{ organizationId: orgB.id, role: 'STAFF' }],
    } as never)

    await expect(requireDeviceAccess(device.id)).rejects.toThrow(ForbiddenError)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- auth-helpers`
Expected: FAIL with "requirePropertyAccess is not a function" (and similarly for `requireDeviceAccess`)

- [ ] **Step 3: Implement the guards**

Modify `lib/auth-helpers.ts`. Add the import at the top:

```ts
import { prisma } from './db'
```

Append at the end of the file:

```ts
export async function requirePropertyAccess(propertyId: string) {
  const property = await prisma.property.findUniqueOrThrow({ where: { id: propertyId } })
  await requireOrgMembership(property.organizationId)
  return property
}

export async function requireDeviceAccess(deviceId: string) {
  const device = await prisma.device.findUniqueOrThrow({
    where: { id: deviceId },
    include: { property: true },
  })
  await requireOrgMembership(device.property.organizationId)
  return device
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- auth-helpers`
Expected: PASS (9 tests)

- [ ] **Step 5: Wire the property guard into property-scoped pages and actions**

Modify `app/(app)/properties/[propertyId]/page.tsx`, add the import and a guard call at the top of the component body (right after destructuring `propertyId` from `params`):

```tsx
import { requirePropertyAccess } from '@/lib/auth-helpers'
```

```tsx
const { propertyId } = await params
await requirePropertyAccess(propertyId)
```

Modify `app/(app)/properties/[propertyId]/actions.ts`, add the import and a guard call as the first line of `createLocationAction`:

```ts
import { requirePropertyAccess } from '@/lib/auth-helpers'
```

```ts
export async function createLocationAction(propertyId: string, formData: FormData) {
  await requirePropertyAccess(propertyId)
  const name = String(formData.get('name') ?? '')
  // ...rest of the function is unchanged
```

Modify `app/(app)/properties/[propertyId]/devices/page.tsx`, add the import and guard call right after destructuring `propertyId`:

```tsx
import { requirePropertyAccess } from '@/lib/auth-helpers'
```

```tsx
const { propertyId } = await params
await requirePropertyAccess(propertyId)
```

Modify `app/(app)/properties/[propertyId]/devices/actions.ts`, add the import and guard call as the first line of `createDeviceAction`:

```ts
import { requirePropertyAccess } from '@/lib/auth-helpers'
```

```ts
export async function createDeviceAction(propertyId: string, formData: FormData) {
  await requirePropertyAccess(propertyId)
  const locationId = String(formData.get('locationId') ?? '')
  // ...rest of the function is unchanged
```

Modify `app/(app)/properties/[propertyId]/edit/page.tsx`. Replace its body to use the guard instead of the unscoped `listProperties` lookup:

```tsx
import { requirePropertyAccess } from '@/lib/auth-helpers'
import { updatePropertyAction } from './actions'

export default async function EditPropertyPage({
  params,
}: {
  params: Promise<{ propertyId: string }>
}) {
  const { propertyId } = await params
  const property = await requirePropertyAccess(propertyId)

  const boundAction = updatePropertyAction.bind(null, propertyId)

  return (
    <form action={boundAction}>
      <h1>Edit property</h1>
      <input name="name" defaultValue={property.name} required />
      <input name="address" defaultValue={property.address} required />
      <input name="type" defaultValue={property.type} required />
      <button type="submit">Save</button>
    </form>
  )
}
```

Modify `app/(app)/properties/[propertyId]/edit/actions.ts`, add the import and guard call as the first line of `updatePropertyAction`:

```ts
import { requirePropertyAccess } from '@/lib/auth-helpers'
```

```ts
export async function updatePropertyAction(propertyId: string, formData: FormData) {
  await requirePropertyAccess(propertyId)
  const name = String(formData.get('name') ?? '')
  // ...rest of the function is unchanged
```

- [ ] **Step 6: Wire the device guard into device-scoped pages and actions**

Modify `app/(app)/devices/[deviceId]/page.tsx`, add the import and guard call right after destructuring `deviceId`:

```tsx
import { requireDeviceAccess } from '@/lib/auth-helpers'
```

```tsx
const { deviceId } = await params
await requireDeviceAccess(deviceId)
```

Modify `app/(app)/devices/[deviceId]/actions.ts`, add the import and a guard call as the first line of each of its four actions (`createScheduleAction`, `completeScheduleAction`, `createTicketAction`, `transitionTicketAction`):

```ts
import { requireDeviceAccess } from '@/lib/auth-helpers'
```

```ts
export async function createScheduleAction(deviceId: string, formData: FormData) {
  await requireDeviceAccess(deviceId)
  const taskDescription = String(formData.get('taskDescription') ?? '')
  // ...rest of the function is unchanged
```

```ts
export async function completeScheduleAction(deviceId: string, scheduleId: string) {
  await requireDeviceAccess(deviceId)
  await recordCompletion(scheduleId)
  revalidatePath(`/devices/${deviceId}`)
}
```

```ts
export async function createTicketAction(deviceId: string, formData: FormData) {
  await requireDeviceAccess(deviceId)
  const problemDescription = String(formData.get('problemDescription') ?? '')
  // ...rest of the function is unchanged
```

```ts
export async function transitionTicketAction(deviceId: string, ticketId: string, formData: FormData) {
  await requireDeviceAccess(deviceId)
  const status = String(formData.get('status') ?? '') as 'IN_PROGRESS' | 'RESOLVED'
  // ...rest of the function is unchanged
```

Modify `app/(app)/devices/[deviceId]/edit/page.tsx`, add the import and guard call right after destructuring `deviceId` (replacing the direct `getDeviceWithHistory` call, since the guard already returns the device — note the guard's return type doesn't include `location`/`replacesDevice`/`replacedByDevice`, so keep both calls):

```tsx
import { requireDeviceAccess } from '@/lib/auth-helpers'
```

```tsx
const { deviceId } = await params
await requireDeviceAccess(deviceId)
const device = await getDeviceWithHistory(deviceId)
```

Modify `app/(app)/devices/[deviceId]/edit/actions.ts`, add the import and guard call as the first line of `updateDeviceAction`:

```ts
import { requireDeviceAccess } from '@/lib/auth-helpers'
```

```ts
export async function updateDeviceAction(deviceId: string, formData: FormData) {
  await requireDeviceAccess(deviceId)
  const brand = String(formData.get('brand') ?? '')
  // ...rest of the function is unchanged
```

Modify `app/(app)/devices/[deviceId]/replace/page.tsx`, add the import and guard call right after destructuring `deviceId`:

```tsx
import { requireDeviceAccess } from '@/lib/auth-helpers'
```

```tsx
const { deviceId } = await params
await requireDeviceAccess(deviceId)
const device = await getDeviceWithHistory(deviceId)
```

Modify `app/(app)/devices/[deviceId]/replace/actions.ts`, add the import and guard call as the first line of `replaceDeviceAction`:

```ts
import { requireDeviceAccess } from '@/lib/auth-helpers'
```

```ts
export async function replaceDeviceAction(
  oldDeviceId: string,
  propertyId: string,
  formData: FormData
) {
  await requireDeviceAccess(oldDeviceId)
  const locationId = String(formData.get('locationId') ?? '')
  // ...rest of the function is unchanged
```

- [ ] **Step 7: Manually verify**

Run: `npm run dev`
- Sign up two separate organizations (two different browser sessions, or log out/in between).
- As Org A, note a property ID and a device ID from its URLs.
- As Org B, manually navigate to Org A's property URL (`/properties/<orgA-property-id>`) and device URL (`/devices/<orgA-device-id>`).
- Confirm both requests now fail (Next.js error overlay from the thrown `ForbiddenError`, consistent with how `SimilarLocationExistsError` already surfaces in dev) instead of leaking Org A's data.

- [ ] **Step 8: Commit**

```bash
git add lib/auth-helpers.ts lib/auth-helpers.test.ts \
  "app/(app)/properties" "app/(app)/devices"
git commit -m "fix: enforce org-scoped authorization on property and device pages"
```

---

## Task 21: Receipt/Warranty Photo Upload

**Files:**
- Create: `lib/services/local-upload.ts`
- Test: `lib/services/local-upload.test.ts`
- Create: `app/api/uploads/route.ts`
- Modify: `.gitignore`
- Modify: `app/(app)/properties/[propertyId]/devices/actions.ts`
- Modify: `app/(app)/properties/[propertyId]/devices/page.tsx`
- Modify: `app/(app)/devices/[deviceId]/edit/actions.ts`
- Modify: `app/(app)/devices/[deviceId]/edit/page.tsx`
- Modify: `app/(app)/devices/[deviceId]/page.tsx`

**Interfaces:**
- Consumes: `createDevice` (Task 7), `updateDevice` (Task 19).
- Produces: `saveUploadedFile(file: File): Promise<string>` (`lib/services/local-upload.ts`) — a local-disk stub standing in for the R2 wiring the design doc defers to a follow-up (per this plan's Global Constraints). Closes the "optional uploaded photo of receipt/warranty card" item from the design doc's Device fields, which Tasks 7/9/19 defined the `receiptPhotoUrl` field for but never exposed in any form.

- [ ] **Step 1: Write the failing test for the upload helper**

Create `lib/services/local-upload.test.ts`:

```ts
import { describe, it, expect, afterEach } from 'vitest'
import { readFile, rm } from 'node:fs/promises'
import path from 'node:path'
import { saveUploadedFile, UPLOAD_DIR } from './local-upload'

describe('saveUploadedFile', () => {
  afterEach(async () => {
    await rm(UPLOAD_DIR, { recursive: true, force: true })
  })

  it('writes the file to disk and returns a URL path under /uploads', async () => {
    const file = new File(['fake receipt bytes'], 'receipt.png', { type: 'image/png' })

    const url = await saveUploadedFile(file)

    expect(url).toMatch(/^\/uploads\/.+\.png$/)
    const savedPath = path.join(UPLOAD_DIR, path.basename(url))
    const contents = await readFile(savedPath, 'utf-8')
    expect(contents).toBe('fake receipt bytes')
  })

  it('rejects files larger than 5MB', async () => {
    const oversized = new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'big.png', {
      type: 'image/png',
    })

    await expect(saveUploadedFile(oversized)).rejects.toThrow('File too large')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- local-upload`
Expected: FAIL with "Cannot find module './local-upload'"

- [ ] **Step 3: Implement the upload helper**

Create `lib/services/local-upload.ts`:

```ts
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'

export const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads')
const MAX_BYTES = 5 * 1024 * 1024

export async function saveUploadedFile(file: File): Promise<string> {
  if (file.size > MAX_BYTES) {
    throw new Error('File too large (max 5MB)')
  }

  await mkdir(UPLOAD_DIR, { recursive: true })

  const ext = path.extname(file.name) || ''
  const filename = `${crypto.randomUUID()}${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())

  await writeFile(path.join(UPLOAD_DIR, filename), buffer)

  return `/uploads/${filename}`
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- local-upload`
Expected: PASS (2 tests)

- [ ] **Step 5: Ignore uploaded files in git**

Modify `.gitignore`, append:

```
/public/uploads
```

- [ ] **Step 6: Add an upload API route for use from client-rendered forms**

Server Actions can accept `File` values directly from a `FormData`, so no separate API route is strictly required for the device forms below — Steps 7-8 read the file straight off the submitted `FormData`. Skip creating `app/api/uploads/route.ts`; it is listed above only because it was the originally considered approach and is explicitly not needed once the Server Action can read the file directly. Do not create this file.

- [ ] **Step 7: Wire photo upload into the device create form**

Modify `app/(app)/properties/[propertyId]/devices/actions.ts`, add the import and file handling in `createDeviceAction`:

```ts
import { saveUploadedFile } from '@/lib/services/local-upload'
```

```ts
export async function createDeviceAction(propertyId: string, formData: FormData) {
  await requirePropertyAccess(propertyId)
  const locationId = String(formData.get('locationId') ?? '')
  const category = String(formData.get('category') ?? '')
  const brand = String(formData.get('brand') ?? '')
  const model = String(formData.get('model') ?? '')
  const purchaseDateRaw = String(formData.get('purchaseDate') ?? '')
  const warrantyMonthsRaw = String(formData.get('warrantyMonths') ?? '')
  const receiptPhoto = formData.get('receiptPhoto') as File | null

  if (!locationId || !category || !brand || !model) {
    throw new Error('Location, category, brand, and model are required')
  }

  const receiptPhotoUrl =
    receiptPhoto && receiptPhoto.size > 0 ? await saveUploadedFile(receiptPhoto) : undefined

  await createDevice({
    propertyId,
    locationId,
    category,
    brand,
    model,
    purchaseDate: purchaseDateRaw ? new Date(purchaseDateRaw) : undefined,
    warrantyMonths: warrantyMonthsRaw ? Number(warrantyMonthsRaw) : undefined,
    receiptPhotoUrl,
  })

  revalidatePath(`/properties/${propertyId}/devices`)
}
```

Modify `app/(app)/properties/[propertyId]/devices/page.tsx`. Add `encType="multipart/form-data"` to the form and a file input, right after the `warrantyMonths` input:

```tsx
<form action={boundAction} encType="multipart/form-data">
```

```tsx
<input name="receiptPhoto" type="file" accept="image/*,.pdf" />
```

- [ ] **Step 8: Wire photo upload into the device edit form**

Modify `app/(app)/devices/[deviceId]/edit/actions.ts`, add the import and file handling in `updateDeviceAction`:

```ts
import { saveUploadedFile } from '@/lib/services/local-upload'
```

```ts
export async function updateDeviceAction(deviceId: string, formData: FormData) {
  await requireDeviceAccess(deviceId)
  const brand = String(formData.get('brand') ?? '')
  const model = String(formData.get('model') ?? '')
  const notes = String(formData.get('notes') ?? '')
  const purchaseDateRaw = String(formData.get('purchaseDate') ?? '')
  const warrantyMonthsRaw = String(formData.get('warrantyMonths') ?? '')
  const receiptPhoto = formData.get('receiptPhoto') as File | null

  const receiptPhotoUrl =
    receiptPhoto && receiptPhoto.size > 0 ? await saveUploadedFile(receiptPhoto) : undefined

  await updateDevice({
    deviceId,
    brand: brand || undefined,
    model: model || undefined,
    notes: notes || undefined,
    purchaseDate: purchaseDateRaw ? new Date(purchaseDateRaw) : undefined,
    warrantyMonths: warrantyMonthsRaw ? Number(warrantyMonthsRaw) : undefined,
    receiptPhotoUrl,
  })

  redirect(`/devices/${deviceId}`)
}
```

Modify `app/(app)/devices/[deviceId]/edit/page.tsx`. Add `encType="multipart/form-data"` to the form and a file input, right before the closing `</form>`:

```tsx
<form action={boundAction} encType="multipart/form-data">
```

```tsx
<input name="receiptPhoto" type="file" accept="image/*,.pdf" />
```

- [ ] **Step 9: Show the uploaded photo on the device detail page**

Modify `app/(app)/devices/[deviceId]/page.tsx`, add right after the `<p>Warranty: ...</p>` line:

```tsx
{device.receiptPhotoUrl && (
  <p>
    <a href={device.receiptPhotoUrl} target="_blank" rel="noopener noreferrer">
      View receipt/warranty photo
    </a>
  </p>
)}
```

- [ ] **Step 10: Manually verify**

Run: `npm run dev`
- Add a device with a receipt photo attached, confirm the device detail page shows a "View receipt/warranty photo" link that opens the uploaded image.
- Edit an existing device and attach a photo, confirm the link appears after saving.
- Confirm `public/uploads/` contains the saved file and is not tracked by `git status` (covered by the `.gitignore` entry).

- [ ] **Step 11: Commit**

```bash
git add lib/services/local-upload.ts lib/services/local-upload.test.ts .gitignore \
  "app/(app)/properties" "app/(app)/devices"
git commit -m "feat: add local-disk receipt/warranty photo upload"
```

---

## Plan Complete

At this point, every v1 feature from the design doc is implemented and locally runnable: org signup/login with roles, staff invites, properties and locations with fuzzy-duplicate detection (including rename), devices with warranty tracking, photo upload, edit, and replacement chains, a private vendor directory with edit/delete, recurring maintenance schedules, full repair ticket workflow, a dashboard tying it all together, and org-scoped authorization guards on every property/device page. Production deployment (Vercel/Neon/R2) is a separate follow-up, as scoped at the start of this plan.
