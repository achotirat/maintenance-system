import { getDeviceWithHistory, warrantyStatus } from '@/lib/services/devices'
import { listSchedulesForDevice } from '@/lib/services/maintenance-schedules'
import { createScheduleAction, completeScheduleAction } from './actions'

export default async function DeviceDetailPage({
  params,
}: {
  params: Promise<{ deviceId: string }>
}) {
  const { deviceId } = await params
  const [device, schedules] = await Promise.all([
    getDeviceWithHistory(deviceId),
    listSchedulesForDevice(deviceId),
  ])

  if (!device) return <p>Device not found</p>

  const boundCreateSchedule = createScheduleAction.bind(null, deviceId)

  return (
    <div>
      <h1>
        {device.category}: {device.brand} {device.model}
      </h1>
      <p>Location: {device.location.name}</p>
      <p>Warranty: {warrantyStatus(device)}</p>

      <h2>Maintenance schedules</h2>
      <ul>
        {schedules.map((s) => (
          <li key={s.id}>
            {s.taskDescription} — next due {s.nextDueAt.toDateString()}
            <form action={completeScheduleAction.bind(null, deviceId, s.id)} style={{ display: 'inline' }}>
              <button type="submit">Mark complete</button>
            </form>
          </li>
        ))}
      </ul>

      <form action={boundCreateSchedule}>
        <h3>Add schedule</h3>
        <input name="taskDescription" placeholder="Task (e.g. Replace filter)" required />
        <input name="intervalDays" type="number" placeholder="Interval (days)" required />
        <button type="submit">Add</button>
      </form>
    </div>
  )
}
