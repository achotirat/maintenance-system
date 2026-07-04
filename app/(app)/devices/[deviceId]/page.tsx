import { getDeviceWithHistory, warrantyStatus } from '@/lib/services/devices'
import { listSchedulesForDevice } from '@/lib/services/maintenance-schedules'
import { listTicketsForDevice, countTicketsForDevice } from '@/lib/services/repair-tickets'
import { createScheduleAction, completeScheduleAction, createTicketAction, transitionTicketAction } from './actions'

export default async function DeviceDetailPage({
  params,
}: {
  params: Promise<{ deviceId: string }>
}) {
  const { deviceId } = await params
  const [device, schedules, tickets] = await Promise.all([
    getDeviceWithHistory(deviceId),
    listSchedulesForDevice(deviceId),
    listTicketsForDevice(deviceId),
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
      {!device.archivedAt && (
        <p>
          <a href={`/devices/${deviceId}/replace`}>Replace this device</a>
        </p>
      )}
      {device.archivedAt && <p>This device was archived on {device.archivedAt.toDateString()}.</p>}
      {device.replacesDevice && (
        <p>
          Replaces:{' '}
          <a href={`/devices/${device.replacesDevice.id}`}>
            {device.replacesDevice.brand} {device.replacesDevice.model}
          </a>
        </p>
      )}
      {device.replacedByDevice && (
        <p>
          Replaced by:{' '}
          <a href={`/devices/${device.replacedByDevice.id}`}>
            {device.replacedByDevice.brand} {device.replacedByDevice.model}
          </a>
        </p>
      )}

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

      <h2>Repair history ({tickets.length} total)</h2>
      <ul>
        {tickets.map((t) => (
          <li key={t.id}>
            [{t.status}] {t.problemDescription}
            {t.status !== 'RESOLVED' && (
              <form action={transitionTicketAction.bind(null, deviceId, t.id)} style={{ display: 'inline' }}>
                <select name="status">
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="RESOLVED">Resolved</option>
                </select>
                <input name="cost" type="number" placeholder="Cost" />
                <input name="resolutionNotes" placeholder="Resolution notes" />
                <button type="submit">Update</button>
              </form>
            )}
          </li>
        ))}
      </ul>

      <form action={createTicketAction.bind(null, deviceId)}>
        <h3>Report a problem</h3>
        <input name="problemDescription" placeholder="What's wrong?" required />
        <button type="submit">Open ticket</button>
      </form>
    </div>
  )
}
