import Link from 'next/link'
import { listLocations } from '@/lib/services/locations'
import { createLocationAction } from './actions'

export default async function PropertyDetailPage({
  params,
}: {
  params: Promise<{ propertyId: string }>
}) {
  const { propertyId } = await params
  const locations = await listLocations(propertyId)
  const boundAction = createLocationAction.bind(null, propertyId)

  return (
    <div>
      <Link href={`/properties/${propertyId}/devices`}>View devices</Link>
      <h1>Locations</h1>
      <ul>
        {locations.map((l) => (
          <li key={l.id}>{l.name}</li>
        ))}
      </ul>

      <form action={boundAction}>
        <input name="name" placeholder="New location name" required />
        <button type="submit">Add location</button>
      </form>
    </div>
  )
}
