import { getDeviceWithHistory } from '@/lib/services/devices'
import { listLocations } from '@/lib/services/locations'
import { requireDeviceAccess } from '@/lib/auth-helpers'
import { replaceDeviceAction } from './actions'

export default async function ReplaceDevicePage({
  params,
}: {
  params: Promise<{ deviceId: string }>
}) {
  const { deviceId } = await params
  await requireDeviceAccess(deviceId)
  const device = await getDeviceWithHistory(deviceId)
  if (!device) return <p>Device not found</p>

  const locations = await listLocations(device.propertyId)
  const boundAction = replaceDeviceAction.bind(null, deviceId, device.propertyId)

  return (
    <div>
      <h1>
        Replace {device.brand} {device.model}
      </h1>
      <form action={boundAction}>
        <select name="locationId" defaultValue={device.locationId} required>
          {locations.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
        <input name="category" defaultValue={device.category} required />
        <input name="brand" placeholder="New brand" required />
        <input name="model" placeholder="New model" required />
        <input name="purchaseDate" type="date" />
        <input name="warrantyMonths" type="number" placeholder="Warranty (months)" />
        <button type="submit">Replace device</button>
      </form>
    </div>
  )
}
