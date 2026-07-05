'use server'

import { revalidatePath } from 'next/cache'
import { getPrimaryOrganizationId, requireOrgAdmin } from '@/lib/auth-helpers'
import { inviteStaffMember } from '@/lib/services/staff'

export async function inviteStaffAction(formData: FormData) {
  const organizationId = await getPrimaryOrganizationId()
  await requireOrgAdmin(organizationId)

  const email = String(formData.get('email') ?? '')
  const name = String(formData.get('name') ?? '')
  const temporaryPassword = String(formData.get('temporaryPassword') ?? '')
  const role = String(formData.get('role') ?? 'STAFF') as 'ADMIN' | 'STAFF'

  if (!email || !name || !temporaryPassword) {
    throw new Error('Email, name, and temporary password are required')
  }

  await inviteStaffMember({ organizationId, email, name, temporaryPassword, role })
  revalidatePath('/staff')
}
