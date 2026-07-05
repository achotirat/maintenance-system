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
