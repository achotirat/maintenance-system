'use server'

import { revalidatePath } from 'next/cache'
import { createMaintenanceSchedule, recordCompletion } from '@/lib/services/maintenance-schedules'

export async function createScheduleAction(deviceId: string, formData: FormData) {
  const taskDescription = String(formData.get('taskDescription') ?? '')
  const intervalDays = Number(formData.get('intervalDays') ?? '')

  if (!taskDescription || !intervalDays) {
    throw new Error('Task description and interval are required')
  }

  await createMaintenanceSchedule({ deviceId, taskDescription, intervalDays })
  revalidatePath(`/devices/${deviceId}`)
}

export async function completeScheduleAction(deviceId: string, scheduleId: string) {
  await recordCompletion(scheduleId)
  revalidatePath(`/devices/${deviceId}`)
}
