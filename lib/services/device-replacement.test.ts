import { describe, it, expect, beforeEach } from 'vitest'
import { resetDb } from '../test-helpers/reset-db'
import { createOrganizationWithOwner } from './organizations'
import { createProperty } from './properties'
import { listLocations } from './locations'
import { createDevice, getDeviceWithHistory } from './devices'
import { replaceDevice } from './device-replacement'

describe('replaceDevice', () => {
  let propertyId: string
  let locationId: string

  beforeEach(async () => {
    await resetDb()
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
    propertyId = property.id
    locationId = (await listLocations(propertyId))[0].id
  })

  it('archives the old device and links the new one', async () => {
    const oldDevice = await createDevice({
      propertyId,
      locationId,
      category: 'Doorlock',
      brand: 'Samsung',
      model: 'SHP-DP728',
    })

    const newDevice = await replaceDevice({
      oldDeviceId: oldDevice.id,
      newDevice: {
        propertyId,
        locationId,
        category: 'Doorlock',
        brand: 'Yale',
        model: 'YDM4109A',
        purchaseDate: new Date('2026-06-01'),
        warrantyMonths: 24,
      },
    })

    expect(newDevice.replacesDeviceId).toBe(oldDevice.id)
    expect(newDevice.warrantyExpiresAt).toEqual(new Date('2028-06-01'))

    const oldWithHistory = await getDeviceWithHistory(oldDevice.id)
    expect(oldWithHistory?.archivedAt).not.toBeNull()

    const newWithHistory = await getDeviceWithHistory(newDevice.id)
    expect(newWithHistory?.replacesDevice?.id).toBe(oldDevice.id)
  })
})
