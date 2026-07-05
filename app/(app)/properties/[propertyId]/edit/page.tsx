import { listProperties } from '@/lib/services/properties'
import { getPrimaryOrganizationId } from '@/lib/auth-helpers'
import { updatePropertyAction } from './actions'

export default async function EditPropertyPage({
  params,
}: {
  params: Promise<{ propertyId: string }>
}) {
  const { propertyId } = await params
  const organizationId = await getPrimaryOrganizationId()
  const property = (await listProperties(organizationId)).find((p) => p.id === propertyId)
  if (!property) return <p>Property not found</p>

  const boundAction = updatePropertyAction.bind(null, propertyId)

  return (
    <form action={boundAction}>
      <h1>Edit property</h1>
      <input name="name" defaultValue={property.name} required />
      <input name="address" defaultValue={property.address} required />
      <input name="type" defaultValue={property.type} required />
      <button type="submit">Save</button>
    </form>
  )
}
