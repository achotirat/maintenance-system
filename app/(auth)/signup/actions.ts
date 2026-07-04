'use server'

import { redirect } from 'next/navigation'
import { createOrganizationWithOwner } from '@/lib/services/organizations'

export async function signupAction(formData: FormData) {
  const organizationName = String(formData.get('organizationName') ?? '')
  const ownerName = String(formData.get('ownerName') ?? '')
  const ownerEmail = String(formData.get('ownerEmail') ?? '')
  const ownerPassword = String(formData.get('ownerPassword') ?? '')

  if (!organizationName || !ownerName || !ownerEmail || !ownerPassword) {
    throw new Error('All fields are required')
  }

  await createOrganizationWithOwner({ organizationName, ownerEmail, ownerPassword, ownerName })
  redirect('/login')
}
