import { describe, it, expect, beforeEach } from 'vitest'
import { resetDb } from '../test-helpers/reset-db'
import { createOrganizationWithOwner } from './organizations'
import { createProperty, listProperties, updateProperty } from './properties'
import { listLocations } from './locations'

describe('properties', () => {
  beforeEach(async () => {
    await resetDb()
  })

  it('creates a property with a default "Whole Property" location', async () => {
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

    expect(property.name).toBe('Villa 1')

    const locations = await listLocations(property.id)
    expect(locations.map((l) => l.name)).toEqual(['Whole Property'])
  })

  it('lists only properties for the given organization', async () => {
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

    await createProperty({ organizationId: orgA.id, name: 'A Property', address: 'x', type: 'hotel' })
    await createProperty({ organizationId: orgB.id, name: 'B Property', address: 'y', type: 'apartment' })

    const propertiesForA = await listProperties(orgA.id)
    expect(propertiesForA.map((p) => p.name)).toEqual(['A Property'])
  })

  it('updates only the provided fields', async () => {
    const org = await createOrganizationWithOwner({
      organizationName: 'Org C',
      ownerEmail: 'c@example.com',
      ownerPassword: 'password123',
      ownerName: 'C',
    })
    const property = await createProperty({
      organizationId: org.id,
      name: 'Old Name',
      address: 'Old Address',
      type: 'hotel',
    })

    const updated = await updateProperty({ propertyId: property.id, name: 'New Name' })

    expect(updated.name).toBe('New Name')
    expect(updated.address).toBe('Old Address')
  })
})
