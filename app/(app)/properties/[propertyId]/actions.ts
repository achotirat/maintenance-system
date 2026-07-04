'use server'

import { revalidatePath } from 'next/cache'
import { createLocation, SimilarLocationExistsError } from '@/lib/services/locations'

export async function createLocationAction(propertyId: string, formData: FormData) {
  const name = String(formData.get('name') ?? '')
  const force = formData.get('force') === 'true'
  if (!name) throw new Error('Name is required')

  try {
    await createLocation({ propertyId, name, force })
  } catch (error) {
    if (error instanceof SimilarLocationExistsError) {
      throw new Error(
        `${error.message}. Resubmit with force=true to add it anyway.`
      )
    }
    throw error
  }

  revalidatePath(`/properties/${propertyId}`)
}
