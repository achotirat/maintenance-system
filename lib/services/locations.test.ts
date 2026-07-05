import { describe, it, expect, beforeEach } from 'vitest'
import { resetDb } from '../test-helpers/reset-db'
import { createOrganizationWithOwner } from './organizations'
import { createProperty } from './properties'
import { createLocation, listLocations, renameLocation, SimilarLocationExistsError } from './locations'

describe('locations', () => {
  let propertyId: string

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
  })

  it('creates a new, distinct location', async () => {
    const location = await createLocation({ propertyId, name: 'Pool Area' })
    expect(location.name).toBe('Pool Area')
  })

  it('throws SimilarLocationExistsError for a near-duplicate name', async () => {
    await createLocation({ propertyId, name: 'Room 101' })

    await expect(createLocation({ propertyId, name: 'room101' })).rejects.toThrow(
      SimilarLocationExistsError
    )
  })

  it('allows a near-duplicate when force is true', async () => {
    await createLocation({ propertyId, name: 'Room 101' })
    const forced = await createLocation({ propertyId, name: 'room101', force: true })
    expect(forced.name).toBe('room101')

    const all = await listLocations(propertyId)
    expect(all.map((l) => l.name).sort()).toEqual(['Room 101', 'Whole Property', 'room101'].sort())
  })

  it('renames a location, checking for fuzzy duplicates against other locations', async () => {
    const room = await createLocation({ propertyId, name: 'Room 101' })
    await createLocation({ propertyId, name: 'Pool Area' })

    const renamed = await renameLocation({ locationId: room.id, name: 'Room 102' })
    expect(renamed.name).toBe('Room 102')
  })

  it('rejects a rename that collides with another existing location', async () => {
    const room = await createLocation({ propertyId, name: 'Room 101' })
    await createLocation({ propertyId, name: 'Pool Area' })

    await expect(renameLocation({ locationId: room.id, name: 'pool area' })).rejects.toThrow(
      SimilarLocationExistsError
    )
  })
})
