'use server'

import { revalidatePath } from 'next/cache'
import { getPrimaryOrganizationId, requireVendorAccess } from '@/lib/auth-helpers'
import { createVendor, updateVendor, deleteVendor } from '@/lib/services/vendors'

export async function createVendorAction(formData: FormData) {
  const organizationId = await getPrimaryOrganizationId()
  const name = String(formData.get('name') ?? '')
  const phone = String(formData.get('phone') ?? '')
  const line = String(formData.get('line') ?? '')
  const specialty = String(formData.get('specialty') ?? '')

  if (!name) throw new Error('Name is required')

  await createVendor({
    organizationId,
    name,
    phone: phone || undefined,
    line: line || undefined,
    specialty: specialty || undefined,
  })

  revalidatePath('/vendors')
}

export async function updateVendorAction(vendorId: string, formData: FormData) {
  await requireVendorAccess(vendorId)
  const name = String(formData.get('name') ?? '')
  const phone = String(formData.get('phone') ?? '')
  const specialty = String(formData.get('specialty') ?? '')

  await updateVendor({
    vendorId,
    name: name || undefined,
    phone: phone || undefined,
    specialty: specialty || undefined,
  })
  revalidatePath('/vendors')
}

export async function deleteVendorAction(vendorId: string) {
  await requireVendorAccess(vendorId)
  await deleteVendor(vendorId)
  revalidatePath('/vendors')
}
