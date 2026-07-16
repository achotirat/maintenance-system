import Link from "next/link";
import { signIn } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  async function loginAction(formData: FormData) {
    "use server";
    try {
      await signIn("credentials", {
        email: formData.get("email"),
        password: formData.get("password"),
        redirect: false,
      });
    } catch {
      redirect("/login?error=invalid");
    }
    redirect("/dashboard");
  }

  return (
    <div className="w-[360px] max-w-full bg-[var(--card)] border border-line rounded-2xl shadow-card p-7">
      <div className="text-xl font-bold">Welcome back</div>
      <div className="text-[13px] text-secondary mt-1 mb-[18px]">
        เข้าสู่ระบบเพื่อดูงานของคุณ
      </div>
      {error && (
        <div className="bg-[rgba(244,63,94,.08)] border border-[rgba(244,63,94,.2)] rounded-lg px-3 py-2 text-[12.5px] text-[#f43f5e] font-medium mb-3">
          Invalid email or password. Please try again.
        </div>
      )}
      <form action={loginAction} className="flex flex-col gap-[11px]">
        <div>
          <div className="text-xs font-semibold text-secondary mb-[5px]">Email</div>
          <input name="email" type="email" placeholder="som@sandsgroup.co" required />
        </div>
        <div>
          <div className="text-xs font-semibold text-secondary mb-[5px]">Password</div>
          <input name="password" type="password" placeholder="••••••••" required />
        </div>
        <button
          type="submit"
          className="border-none bg-brand text-white rounded-[10px] p-3 text-[14.5px] font-semibold mt-1.5 hover:bg-brand-hover transition-colors"
        >
          Sign in · เข้าสู่ระบบ
        </button>
      </form>
      <div className="text-[13px] text-secondary mt-4 text-center">
        New here?{" "}
        <Link href="/signup" className="text-brand font-semibold">
          Create a workspace
        </Link>
      </div>
    </div>
  );
}
