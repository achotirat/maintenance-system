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
