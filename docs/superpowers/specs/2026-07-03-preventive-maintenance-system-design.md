# Preventive Maintenance System — Design

**Date:** 2026-07-03
**Status:** Approved for planning

## Problem

Small property operators (hotels, apartments, villas — "อพาร์ทเมนต์" etc.) lack a
system to track:

- Where to find support when a device breaks
- When recurring maintenance is due (e.g. AC filter changes)
- Who to call to fix a specific device, and the purchase/warranty details a
  vendor will ask for (purchase date, vendor, warranty card, model)
- How often a given device has needed repair
- Which brands/models are in use across a property

This is a multi-tenant SaaS: multiple property owners/organizations, each
managing one or more properties, will use the same platform independently.

## Users & Access

- **Organization** — the tenant boundary. Multiple orgs use the platform,
  fully isolated from each other.
- **Staff roles within an org:**
  - **Admin** — full access, including org settings and staff management
  - **Staff** — can manage devices, log repairs, view everything; cannot
    manage billing/org settings
- Platform is a **responsive web app** (works on phone browsers) — no native
  mobile app for v1.

## Core Data Model

### Organization
Tenant root. Has many staff members (with roles) and properties.

### Property
Belongs to an org. Fields: name, address, type (hotel/apartment/villa/etc).

### Location
Belongs to a property. A curated, owner-defined list of places within that
property (e.g. "Room 101", "Pool Area", "Utility Room"). Not a rigid
building/floor hierarchy — flat list per property, kept clean via
autocomplete + fuzzy-duplicate detection when adding new entries (nudges
"Did you mean 'Room 101'?" instead of creating near-duplicate location
names). Every property gets a default "Whole Property" location for shared
infrastructure (e.g. generator, router) that isn't tied to one room.

### Device
The central entity. Belongs to a property, assigned to a location (required).
Fields:
- Category (e.g. Doorlock, AC, Water Heater) — structured, not free text
- Brand, model — structured, to support filtering/reporting (e.g. "which
  doorlock brands are in use at this villa")
- Location (from the property's location list)
- Purchase date, purchase vendor
- Warranty length / computed expiry date
- Optional uploaded photo of receipt/warranty card
- Notes

**Replacement handling:** when a device is physically replaced (not just
repaired), the old device record is archived (not deleted) and a new device
record is created, with a link between them. This preserves repair/
maintenance history against the correct physical unit while still letting
you trace "this doorlock replaced that one."

### Vendor / Contact
Private per-org list of repair contacts: name, phone/LINE/email, specialty
(e.g. "doorlock repair"), notes. Not shared across organizations in v1.

### Maintenance Schedule
Attached to a device: recurring interval (e.g. every 3 months) + task
description (e.g. "replace filter"). After each completion, the next due
date is auto-generated. Surfaces on the in-app dashboard when due.

### Repair Ticket
Attached to a device. Full workflow: **Open → In Progress → Resolved**.
Fields: problem description, assigned vendor/staff, cost, resolution notes,
timestamps. This is the source of truth for "how many times has this device
needed fixing" — visible as history on the device detail page.

## Key Flows

1. **Warranty expiry flagging** — a daily scheduled job scans devices for
   warranties expiring soon or already expired, surfaces them on the
   dashboard.
2. **Maintenance due** — the same daily job checks maintenance schedules for
   due/overdue tasks, surfaces them on the dashboard.
3. **Device detail page** — shows full history for one physical device:
   purchase/warranty info, all repair tickets, all maintenance completions,
   and (if applicable) the replacement chain (previous/next device).
4. **In-app dashboard** — per org: upcoming maintenance, expiring warranties,
   open repair tickets. This is the v1 notification mechanism (no
   LINE/email push yet).

## Tech Stack

- **Next.js (TypeScript)** — single app, frontend + API routes, responsive UI
- **Neon (Postgres)** — serverless Postgres; free tier has no project-count
  cap (avoids a constraint hit with Supabase, where both free-tier project
  slots are already used on other work)
- **Prisma** — schema/migrations/ORM
- **Auth.js (NextAuth)** — session-based auth; org membership carries a role
  (Admin/Staff)
- **Cloudflare R2** — object storage for warranty card/receipt photo uploads
  (S3-compatible, free tier, no egress fees)
- **Vercel** — hosting, zero-config deploys, plus Vercel Cron for the daily
  warranty/maintenance scan job

Multi-tenancy is enforced in the application/query layer (every table scoped
by `org_id`, checked in code) rather than via Postgres RLS, to keep the
approach simple and portable across the chosen stack.

## V1 Scope

**In scope:**
- Org signup/login, staff invites with Admin/Staff roles
- Property CRUD, location list management with fuzzy-duplicate nudging
- Device CRUD: category/brand/model, location, warranty fields + photo
  upload, expiry flagging
- Device replacement flow (archive + link)
- Private per-org vendor/contact list
- Maintenance schedules with auto-recurring due dates
- Repair ticket workflow (Open/In Progress/Resolved) with cost + notes
- In-app dashboard: upcoming maintenance, expiring warranties, open tickets
- Device detail page with full history (repairs + maintenance +
  replacement chain)

**Explicitly out of scope for v1 (fast-follow candidates):**
- Shared cross-org vendor directory (crowdsourced recommendations)
- LINE/email notifications (in-app only for now)
- Native mobile app
- AI-assisted location dedup/merge (v1 uses simple fuzzy-match only)
- Reporting/analytics beyond the device detail page (cost trends,
  cross-property brand comparisons, etc.)
