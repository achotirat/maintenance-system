'use server'

import { revalidatePath } from 'next/cache'
import { getPrimaryOrganizationId } from '@/lib/auth-helpers'
import { createProperty } from '@/lib/services/properties'

export async function createPropertyAction(formData: FormData) {
  const organizationId = await getPrimaryOrganizationId()
  const name = String(formData.get('name') ?? '')
  const address = String(formData.get('address') ?? '')
  const type = String(formData.get('type') ?? '')

  if (!name || !address || !type) throw new Error('All fields are required')

  await createProperty({ organizationId, name, address, type })
  revalidatePath('/properties')
}
