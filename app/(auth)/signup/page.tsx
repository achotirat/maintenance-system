import { signupAction } from './actions'

export default function SignupPage() {
  return (
    <form action={signupAction}>
      <h1>Create your organization</h1>
      <input name="organizationName" placeholder="Organization name" required />
      <input name="ownerName" placeholder="Your name" required />
      <input name="ownerEmail" type="email" placeholder="Email" required />
      <input name="ownerPassword" type="password" placeholder="Password" required minLength={8} />
      <button type="submit">Sign up</button>
    </form>
  )
}
