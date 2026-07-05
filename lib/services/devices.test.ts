import { describe, it, expect, beforeEach } from 'vitest'
import { resetDb } from '../test-helpers/reset-db'
import { createOrganizationWithOwner } from './organizations'
import { createProperty } from './properties'
import { listLocations } from './locations'
import { createDevice, listDevices, getDeviceWithHistory, warrantyStatus, updateDevice } from './devices'

describe('devices', () => {
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
    const locations = await listLocations(propertyId)
    locationId = locations[0].id
  })

  it('creates a device and computes warrantyExpiresAt from purchaseDate + warrantyMonths', async () => {
    const device = await createDevice({
      propertyId,
      locationId,
      category: 'Doorlock',
      brand: 'Samsung',
      model: 'SHP-DP728',
      purchaseDate: new Date('2026-01-01'),
      warrantyMonths: 12,
    })

    expect(device.warrantyExpiresAt).toEqual(new Date('2027-01-01'))
  })

  it('lists only non-archived devices for a property by default', async () => {
    const device = await createDevice({
      propertyId,
      locationId,
      category: 'Doorlock',
      brand: 'Samsung',
      model: 'SHP-DP728',
    })

    const devices = await listDevices(propertyId)
    expect(devices.map((d) => d.id)).toEqual([device.id])
  })

  it('getDeviceWithHistory returns the device with its location', async () => {
    const device = await createDevice({
      propertyId,
      locationId,
      category: 'AC',
      brand: 'Daikin',
      model: 'FTKF25',
    })

    const withHistory = await getDeviceWithHistory(device.id)
    expect(withHistory?.location.id).toBe(locationId)
  })

  it('updates fields and recomputes warrantyExpiresAt when purchase info changes', async () => {
    const device = await createDevice({
      propertyId,
      locationId,
      category: 'AC',
      brand: 'Daikin',
      model: 'FTKF25',
      purchaseDate: new Date('2026-01-01'),
      warrantyMonths: 12,
    })

    const updated = await updateDevice({
      deviceId: device.id,
      purchaseDate: new Date('2026-02-01'),
      warrantyMonths: 24,
    })

    expect(updated.warrantyExpiresAt).toEqual(new Date('2028-02-01'))
  })
})

describe('warrantyStatus', () => {
  it('returns "none" when there is no warrantyExpiresAt', () => {
    expect(warrantyStatus({ warrantyExpiresAt: null })).toBe('none')
  })

  it('returns "expired" when warrantyExpiresAt is in the past', () => {
    const now = new Date('2026-06-01')
    expect(warrantyStatus({ warrantyExpiresAt: new Date('2026-05-01') }, now)).toBe('expired')
  })

  it('returns "expiring_soon" within 30 days of expiry', () => {
    const now = new Date('2026-06-01')
    expect(warrantyStatus({ warrantyExpiresAt: new Date('2026-06-15') }, now)).toBe('expiring_soon')
  })

  it('returns "active" when expiry is more than 30 days away', () => {
    const now = new Date('2026-06-01')
    expect(warrantyStatus({ warrantyExpiresAt: new Date('2026-12-01') }, now)).toBe('active')
  })
})
