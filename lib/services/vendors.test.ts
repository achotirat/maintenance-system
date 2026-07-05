import { describe, it, expect, beforeEach } from 'vitest'
import { resetDb } from '../test-helpers/reset-db'
import { createOrganizationWithOwner } from './organizations'
import { createVendor, listVendors, updateVendor, deleteVendor } from './vendors'

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
})
