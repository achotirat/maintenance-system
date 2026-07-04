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

// `auth` is a NextAuth overloaded export (plain session getter vs. route-handler
// wrapper); narrow the mock to the no-args session-getter overload these tests use.
const mockedAuth = vi.mocked(auth as unknown as () => Promise<unknown>)

describe('auth-helpers', () => {
  beforeEach(() => {
    mockedAuth.mockReset()
  })

  it('requireSession throws UnauthorizedError when no session', async () => {
    mockedAuth.mockResolvedValue(null)
    await expect(requireSession()).rejects.toThrow(UnauthorizedError)
  })

  it('requireOrgMembership returns the matching membership', async () => {
    mockedAuth.mockResolvedValue({
      user: { id: 'u1' },
      memberships: [{ organizationId: 'org1', role: 'STAFF' }],
    } as never)

    const membership = await requireOrgMembership('org1')
    expect(membership.role).toBe('STAFF')
  })

  it('requireOrgMembership throws ForbiddenError when not a member', async () => {
    mockedAuth.mockResolvedValue({
      user: { id: 'u1' },
      memberships: [{ organizationId: 'org1', role: 'STAFF' }],
    } as never)

    await expect(requireOrgMembership('org2')).rejects.toThrow(ForbiddenError)
  })

  it('requireOrgAdmin returns the membership for ADMIN role', async () => {
    mockedAuth.mockResolvedValue({
      user: { id: 'u1' },
      memberships: [{ organizationId: 'org1', role: 'ADMIN' }],
    } as never)

    const membership = await requireOrgAdmin('org1')
    expect(membership.role).toBe('ADMIN')
  })

  it('requireOrgAdmin throws ForbiddenError for STAFF role', async () => {
    mockedAuth.mockResolvedValue({
      user: { id: 'u1' },
      memberships: [{ organizationId: 'org1', role: 'STAFF' }],
    } as never)

    await expect(requireOrgAdmin('org1')).rejects.toThrow(ForbiddenError)
  })

  it('getPrimaryOrganizationId returns the first membership org', async () => {
    mockedAuth.mockResolvedValue({
      user: { id: 'u1' },
      memberships: [{ organizationId: 'org1', role: 'ADMIN' }],
    } as never)

    await expect(getPrimaryOrganizationId()).resolves.toBe('org1')
  })
})
