'use server'

import { revalidatePath } from 'next/cache'
import { createDevice } from '@/lib/services/devices'
import { requirePropertyAccess } from '@/lib/auth-helpers'
import { saveUploadedFile } from '@/lib/services/local-upload'

export async function createDeviceAction(propertyId: string, formData: FormData) {
  await requirePropertyAccess(propertyId)
  const locationId = String(formData.get('locationId') ?? '')
  const category = String(formData.get('category') ?? '')
  const brand = String(formData.get('brand') ?? '')
  const model = String(formData.get('model') ?? '')
  const purchaseDateRaw = String(formData.get('purchaseDate') ?? '')
  const warrantyMonthsRaw = String(formData.get('warrantyMonths') ?? '')
  const receiptPhoto = formData.get('receiptPhoto') as File | null

  if (!locationId || !category || !brand || !model) {
    throw new Error('Location, category, brand, and model are required')
  }

  const receiptPhotoUrl =
    receiptPhoto && receiptPhoto.size > 0 ? await saveUploadedFile(receiptPhoto) : undefined

  await createDevice({
    propertyId,
    locationId,
    category,
    brand,
    model,
    purchaseDate: purchaseDateRaw ? new Date(purchaseDateRaw) : undefined,
    warrantyMonths: warrantyMonthsRaw ? Number(warrantyMonthsRaw) : undefined,
    receiptPhotoUrl,
  })

  revalidatePath(`/properties/${propertyId}/devices`)
}
