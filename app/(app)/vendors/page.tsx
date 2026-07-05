import { getPrimaryOrganizationId } from '@/lib/auth-helpers'
import { listVendors } from '@/lib/services/vendors'
import { createVendorAction, updateVendorAction, deleteVendorAction } from './actions'

export default async function VendorsPage() {
  const organizationId = await getPrimaryOrganizationId()
  const vendors = await listVendors(organizationId)

  return (
    <div>
      <h1>Vendors</h1>
      <ul>
        {vendors.map((v) => (
          <li key={v.id}>
            <form action={updateVendorAction.bind(null, v.id)} style={{ display: 'inline' }}>
              <input name="name" defaultValue={v.name} />
              <input name="phone" defaultValue={v.phone ?? ''} />
              <input name="specialty" defaultValue={v.specialty ?? ''} />
              <button type="submit">Save</button>
            </form>
            <form action={deleteVendorAction.bind(null, v.id)} style={{ display: 'inline' }}>
              <button type="submit">Delete</button>
            </form>
          </li>
        ))}
      </ul>

      <form action={createVendorAction}>
        <h2>Add vendor</h2>
        <input name="name" placeholder="Name" required />
        <input name="phone" placeholder="Phone" />
        <input name="line" placeholder="LINE ID" />
        <input name="specialty" placeholder="Specialty (e.g. doorlock repair)" />
        <button type="submit">Add vendor</button>
      </form>
    </div>
  )
}
