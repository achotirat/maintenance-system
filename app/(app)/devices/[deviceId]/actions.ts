'use server'

import { revalidatePath } from 'next/cache'
import { createMaintenanceSchedule, recordCompletion } from '@/lib/services/maintenance-schedules'
import { createRepairTicket, transitionTicket } from '@/lib/services/repair-tickets'

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

export async function createTicketAction(deviceId: string, formData: FormData) {
  const problemDescription = String(formData.get('problemDescription') ?? '')
  if (!problemDescription) throw new Error('Problem description is required')

  await createRepairTicket({ deviceId, problemDescription })
  revalidatePath(`/devices/${deviceId}`)
}

export async function transitionTicketAction(deviceId: string, ticketId: string, formData: FormData) {
  const status = String(formData.get('status') ?? '') as 'IN_PROGRESS' | 'RESOLVED'
  const costRaw = String(formData.get('cost') ?? '')
  const resolutionNotes = String(formData.get('resolutionNotes') ?? '')

  await transitionTicket({
    ticketId,
    status,
    cost: costRaw ? Number(costRaw) : undefined,
    resolutionNotes: resolutionNotes || undefined,
  })
  revalidatePath(`/devices/${deviceId}`)
}
