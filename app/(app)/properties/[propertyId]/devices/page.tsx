import Link from 'next/link'
import { listDevices, warrantyStatus } from '@/lib/services/devices'
import { listLocations } from '@/lib/services/locations'
import { createDeviceAction } from './actions'

export default async function DevicesPage({
  params,
}: {
  params: Promise<{ propertyId: string }>
}) {
  const { propertyId } = await params
  const [devices, locations] = await Promise.all([
    listDevices(propertyId),
    listLocations(propertyId),
  ])
  const boundAction = createDeviceAction.bind(null, propertyId)

  return (
    <div>
      <h1>Devices</h1>
      <ul>
        {devices.map((d) => (
          <li key={d.id}>
            <Link href={`/devices/${d.id}`}>
              {d.category}: {d.brand} {d.model} — {warrantyStatus(d)}
            </Link>
          </li>
        ))}
      </ul>

      <form action={boundAction}>
        <h2>Add device</h2>
        <select name="locationId" required>
          {locations.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
        <input name="category" placeholder="Category (e.g. Doorlock)" required />
        <input name="brand" placeholder="Brand" required />
        <input name="model" placeholder="Model" required />
        <input name="purchaseDate" type="date" />
        <input name="warrantyMonths" type="number" placeholder="Warranty (months)" />
        <button type="submit">Add device</button>
      </form>
    </div>
  )
}
