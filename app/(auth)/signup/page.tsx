import Link from "next/link";
import { signupAction } from "./actions";

export default function SignupPage() {
  return (
    <div className="w-[360px] max-w-full bg-[var(--card)] border border-line rounded-2xl shadow-card p-7">
      <div className="text-xl font-bold">Create your workspace</div>
      <div className="text-[13px] text-secondary mt-1 mb-[18px]">
        สร้างองค์กรและบัญชีผู้ดูแลในขั้นตอนเดียว
      </div>
      <form action={signupAction} className="flex flex-col gap-[11px]">
        <div>
          <div className="text-xs font-semibold text-secondary mb-[5px]">
            Organization · ชื่อองค์กร
          </div>
          <input name="organizationName" placeholder="Sands Hospitality Group" required />
        </div>
        <div>
          <div className="text-xs font-semibold text-secondary mb-[5px]">Your name</div>
          <input name="ownerName" placeholder="Som Manee" required />
        </div>
        <div>
          <div className="text-xs font-semibold text-secondary mb-[5px]">Email</div>
          <input name="ownerEmail" type="email" placeholder="som@sandsgroup.co" required />
        </div>
        <div>
          <div className="text-xs font-semibold text-secondary mb-[5px]">Password</div>
          <input name="ownerPassword" type="password" placeholder="••••••••" required minLength={8} />
        </div>
        <button
          type="submit"
          className="border-none bg-brand text-white rounded-[10px] p-3 text-[14.5px] font-semibold mt-1.5 hover:bg-brand-hover transition-colors"
        >
          Create workspace · เริ่มใช้งาน
        </button>
      </form>
      <div className="text-[13px] text-secondary mt-4 text-center">
        Already have an account?{" "}
        <Link href="/login" className="text-brand font-semibold">
          Sign in
        </Link>
      </div>
    </div>
  );
}
