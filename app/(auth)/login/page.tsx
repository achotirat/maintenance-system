import { signIn } from '@/lib/auth'

export default function LoginPage() {
  async function loginAction(formData: FormData) {
    'use server'
    await signIn('credentials', {
      email: formData.get('email'),
      password: formData.get('password'),
      redirectTo: '/dashboard',
    })
  }

  return (
    <form action={loginAction}>
      <h1>Log in</h1>
      <input name="email" type="email" placeholder="Email" required />
      <input name="password" type="password" placeholder="Password" required />
      <button type="submit">Log in</button>
    </form>
  )
}
