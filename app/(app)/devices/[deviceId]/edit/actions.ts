'use server'

import { redirect } from 'next/navigation'
import { updateDevice } from '@/lib/services/devices'

export async function updateDeviceAction(deviceId: string, formData: FormData) {
  const brand = String(formData.get('brand') ?? '')
  const model = String(formData.get('model') ?? '')
  const notes = String(formData.get('notes') ?? '')
  const purchaseDateRaw = String(formData.get('purchaseDate') ?? '')
  const warrantyMonthsRaw = String(formData.get('warrantyMonths') ?? '')

  await updateDevice({
    deviceId,
    brand: brand || undefined,
    model: model || undefined,
    notes: notes || undefined,
    purchaseDate: purchaseDateRaw ? new Date(purchaseDateRaw) : undefined,
    warrantyMonths: warrantyMonthsRaw ? Number(warrantyMonthsRaw) : undefined,
  })

  redirect(`/devices/${deviceId}`)
}
