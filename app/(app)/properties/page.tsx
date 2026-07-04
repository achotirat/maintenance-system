import Link from 'next/link'
import { getPrimaryOrganizationId } from '@/lib/auth-helpers'
import { listProperties } from '@/lib/services/properties'
import { createPropertyAction } from './actions'

export default async function PropertiesPage() {
  const organizationId = await getPrimaryOrganizationId()
  const properties = await listProperties(organizationId)

  return (
    <div>
      <h1>Properties</h1>
      <ul>
        {properties.map((p) => (
          <li key={p.id}>
            <Link href={`/properties/${p.id}`}>
              {p.name} ({p.type})
            </Link>
          </li>
        ))}
      </ul>

      <form action={createPropertyAction}>
        <h2>Add property</h2>
        <input name="name" placeholder="Name" required />
        <input name="address" placeholder="Address" required />
        <input name="type" placeholder="Type (hotel/apartment/villa)" required />
        <button type="submit">Create</button>
      </form>
    </div>
  )
}
