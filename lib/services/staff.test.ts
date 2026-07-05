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
