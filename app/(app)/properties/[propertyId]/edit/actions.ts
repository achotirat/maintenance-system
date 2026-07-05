'use server'

import { redirect } from 'next/navigation'
import { updateProperty } from '@/lib/services/properties'
import { requirePropertyAccess } from '@/lib/auth-helpers'

export async function updatePropertyAction(propertyId: string, formData: FormData) {
  await requirePropertyAccess(propertyId)
  const name = String(formData.get('name') ?? '')
  const address = String(formData.get('address') ?? '')
  const type = String(formData.get('type') ?? '')

  await updateProperty({
    propertyId,
    name: name || undefined,
    address: address || undefined,
    type: type || undefined,
  })

  redirect(`/properties/${propertyId}`)
}
