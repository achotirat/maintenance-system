import { describe, it, expect, vi, beforeEach } from 'vitest'
import { resetDb } from './test-helpers/reset-db'
import { createOrganizationWithOwner } from './services/organizations'
import { createProperty } from './services/properties'
import { listLocations } from './services/locations'
import { createDevice } from './services/devices'
import { createVendor } from './services/vendors'

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
  requireVendorAccess,
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

describe('requireVendorAccess', () => {
  beforeEach(async () => {
    await resetDb()
    vi.mocked(auth).mockReset()
  })

  it('returns the vendor when the session belongs to its organization', async () => {
    const org = await createOrganizationWithOwner({
      organizationName: 'Sunset Villas',
      ownerEmail: 'owner3@example.com',
      ownerPassword: 'password123',
      ownerName: 'Owner',
    })
    const vendor = await createVendor({
      organizationId: org.id,
      name: 'Acme Repairs',
    })

    vi.mocked(auth).mockResolvedValue({
      user: { id: 'u1' },
      memberships: [{ organizationId: org.id, role: 'STAFF' }],
    } as never)

    const result = await requireVendorAccess(vendor.id)
    expect(result.id).toBe(vendor.id)
  })

  it('throws ForbiddenError when the session belongs to a different organization', async () => {
    const orgA = await createOrganizationWithOwner({
      organizationName: 'Org E',
      ownerEmail: 'e@example.com',
      ownerPassword: 'password123',
      ownerName: 'E',
    })
    const orgB = await createOrganizationWithOwner({
      organizationName: 'Org F',
      ownerEmail: 'f@example.com',
      ownerPassword: 'password123',
      ownerName: 'F',
    })
    const vendor = await createVendor({
      organizationId: orgA.id,
      name: 'Acme Repairs',
    })

    vi.mocked(auth).mockResolvedValue({
      user: { id: 'u1' },
      memberships: [{ organizationId: orgB.id, role: 'STAFF' }],
    } as never)

    await expect(requireVendorAccess(vendor.id)).rejects.toThrow(ForbiddenError)
  })
})
