import { auth } from './auth'
import { prisma } from './db'

export class UnauthorizedError extends Error {}
export class ForbiddenError extends Error {}

type Membership = { organizationId: string; role: 'ADMIN' | 'STAFF' }
type SessionWithMemberships = { user?: unknown; memberships?: Membership[] }

export async function requireSession() {
  const session = (await auth()) as SessionWithMemberships | null
  if (!session?.user) throw new UnauthorizedError('Not signed in')
  return session
}

export async function requireOrgMembership(organizationId: string) {
  const session = await requireSession()
  const membership = session.memberships?.find((m) => m.organizationId === organizationId)
  if (!membership) throw new ForbiddenError('Not a member of this organization')
  return membership
}

export async function requireOrgAdmin(organizationId: string) {
  const membership = await requireOrgMembership(organizationId)
  if (membership.role !== 'ADMIN') throw new ForbiddenError('Admin role required')
  return membership
}

export async function getPrimaryOrganizationId() {
  const session = await requireSession()
  if (!session.memberships || session.memberships.length === 0) {
    throw new ForbiddenError('No organization membership')
  }
  return session.memberships[0].organizationId
}

export async function requirePropertyAccess(propertyId: string) {
  const property = await prisma.property.findUniqueOrThrow({ where: { id: propertyId } })
  await requireOrgMembership(property.organizationId)
  return property
}

export async function requireDeviceAccess(deviceId: string) {
  const device = await prisma.device.findUniqueOrThrow({
    where: { id: deviceId },
    include: { property: true },
  })
  await requireOrgMembership(device.property.organizationId)
  return device
}
