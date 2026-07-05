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
