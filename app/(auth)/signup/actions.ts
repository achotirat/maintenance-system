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

  try {
    await createOrganizationWithOwner({ organizationName, ownerEmail, ownerPassword, ownerName })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Signup failed'
    if (msg.includes('Unique constraint')) {
      redirect('/signup?error=email-taken')
    }
    redirect('/signup?error=unknown')
  }
  redirect('/login')
}
