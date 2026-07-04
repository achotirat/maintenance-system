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
