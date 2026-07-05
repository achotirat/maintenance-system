'use server'

import { redirect } from 'next/navigation'
import { updateDevice } from '@/lib/services/devices'
import { requireDeviceAccess } from '@/lib/auth-helpers'
import { saveUploadedFile } from '@/lib/services/local-upload'

export async function updateDeviceAction(deviceId: string, formData: FormData) {
  await requireDeviceAccess(deviceId)
  const brand = String(formData.get('brand') ?? '')
  const model = String(formData.get('model') ?? '')
  const notes = String(formData.get('notes') ?? '')
  const purchaseDateRaw = String(formData.get('purchaseDate') ?? '')
  const warrantyMonthsRaw = String(formData.get('warrantyMonths') ?? '')
  const receiptPhoto = formData.get('receiptPhoto') as File | null

  const receiptPhotoUrl =
    receiptPhoto && receiptPhoto.size > 0 ? await saveUploadedFile(receiptPhoto) : undefined

  await updateDevice({
    deviceId,
    brand: brand || undefined,
    model: model || undefined,
    notes: notes || undefined,
    purchaseDate: purchaseDateRaw ? new Date(purchaseDateRaw) : undefined,
    warrantyMonths: warrantyMonthsRaw ? Number(warrantyMonthsRaw) : undefined,
    receiptPhotoUrl,
  })

  redirect(`/devices/${deviceId}`)
}
