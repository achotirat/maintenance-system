import { getDeviceWithHistory } from '@/lib/services/devices'
import { requireDeviceAccess } from '@/lib/auth-helpers'
import { updateDeviceAction } from './actions'

export default async function EditDevicePage({
  params,
}: {
  params: Promise<{ deviceId: string }>
}) {
  const { deviceId } = await params
  await requireDeviceAccess(deviceId)
  const device = await getDeviceWithHistory(deviceId)
  if (!device) return <p>Device not found</p>

  const boundAction = updateDeviceAction.bind(null, deviceId)

  return (
    <form action={boundAction} encType="multipart/form-data">
      <h1>Edit device</h1>
      <input name="brand" defaultValue={device.brand} required />
      <input name="model" defaultValue={device.model} required />
      <input
        name="purchaseDate"
        type="date"
        defaultValue={device.purchaseDate?.toISOString().slice(0, 10)}
      />
      <input name="warrantyMonths" type="number" defaultValue={device.warrantyMonths ?? undefined} />
      <textarea name="notes" defaultValue={device.notes ?? ''} />
      <input name="receiptPhoto" type="file" accept="image/*,.pdf" />
      <button type="submit">Save</button>
    </form>
  )
}
