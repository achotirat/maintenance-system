'use server'

import { redirect } from 'next/navigation'
import { replaceDevice } from '@/lib/services/device-replacement'

export async function replaceDeviceAction(
  oldDeviceId: string,
  propertyId: string,
  formData: FormData
) {
  const locationId = String(formData.get('locationId') ?? '')
  const category = String(formData.get('category') ?? '')
  const brand = String(formData.get('brand') ?? '')
  const model = String(formData.get('model') ?? '')
  const purchaseDateRaw = String(formData.get('purchaseDate') ?? '')
  const warrantyMonthsRaw = String(formData.get('warrantyMonths') ?? '')

  if (!locationId || !category || !brand || !model) {
    throw new Error('Location, category, brand, and model are required')
  }

  const newDevice = await replaceDevice({
    oldDeviceId,
    newDevice: {
      propertyId,
      locationId,
      category,
      brand,
      model,
      purchaseDate: purchaseDateRaw ? new Date(purchaseDateRaw) : undefined,
      warrantyMonths: warrantyMonthsRaw ? Number(warrantyMonthsRaw) : undefined,
    },
  })

  redirect(`/devices/${newDevice.id}`)
}
