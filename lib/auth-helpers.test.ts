import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('./auth')

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
    ;(auth as any).mockReset()
  })

  it('requireSession throws UnauthorizedError when no session', async () => {
    ;(auth as any).mockResolvedValue(null)
    await expect(requireSession()).rejects.toThrow(UnauthorizedError)
  })

  it('requireOrgMembership returns the matching membership', async () => {
    ;(auth as any).mockResolvedValue({
      user: { id: 'u1' },
      memberships: [{ organizationId: 'org1', role: 'STAFF' }],
    } as never)

    const membership = await requireOrgMembership('org1')
    expect(membership.role).toBe('STAFF')
  })

  it('requireOrgMembership throws ForbiddenError when not a member', async () => {
    ;(auth as any).mockResolvedValue({
      user: { id: 'u1' },
      memberships: [{ organizationId: 'org1', role: 'STAFF' }],
    } as never)

    await expect(requireOrgMembership('org2')).rejects.toThrow(ForbiddenError)
  })

  it('requireOrgAdmin throws ForbiddenError for STAFF role', async () => {
    ;(auth as any).mockResolvedValue({
      user: { id: 'u1' },
      memberships: [{ organizationId: 'org1', role: 'STAFF' }],
    } as never)

    await expect(requireOrgAdmin('org1')).rejects.toThrow(ForbiddenError)
  })

  it('getPrimaryOrganizationId returns the first membership org', async () => {
    ;(auth as any).mockResolvedValue({
      user: { id: 'u1' },
      memberships: [{ organizationId: 'org1', role: 'ADMIN' }],
    } as never)

    await expect(getPrimaryOrganizationId()).resolves.toBe('org1')
  })
})
