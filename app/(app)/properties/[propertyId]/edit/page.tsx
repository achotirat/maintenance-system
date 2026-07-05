import { requirePropertyAccess } from '@/lib/auth-helpers'
import { updatePropertyAction } from './actions'

export default async function EditPropertyPage({
  params,
}: {
  params: Promise<{ propertyId: string }>
}) {
  const { propertyId } = await params
  const property = await requirePropertyAccess(propertyId)

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
