import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-[#191830] to-[#312e81] text-white flex flex-col items-center justify-center p-8 text-center">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-brand grid place-items-center font-bold text-lg">
          D
        </div>
        <span className="font-bold text-2xl">DueSpot</span>
      </div>
      <h1 className="text-4xl md:text-5xl font-bold max-w-xl leading-tight">
        Never miss a maintenance date again.
      </h1>
      <p className="mt-3 text-lg text-[#c5c5e4] max-w-md">
        ไม่พลาดทุกกำหนดบำรุงรักษา — Track devices, schedules, warranties and repairs in one place.
      </p>
      <div className="mt-8 flex gap-3">
        <Link
          href="/login"
          className="rounded-xl border border-white/20 bg-white/5 px-5 py-3 text-[14.5px] font-semibold text-white hover:bg-white/10 transition-colors"
        >
          Sign in · เข้าสู่ระบบ
        </Link>
        <Link
          href="/signup"
          className="rounded-xl bg-brand px-5 py-3 text-[14.5px] font-semibold text-white hover:bg-brand-hover transition-colors"
        >
          Get started · เริ่มใช้งาน
        </Link>
      </div>
      <div className="mt-16 flex flex-col md:flex-row gap-6 text-left max-w-2xl">
        <div className="flex gap-3 text-[14.5px] text-[#c5c5e4]">
          <span className="text-brand text-lg">✓</span>
          <span>Track every device across hotels, villas, apartments and spas</span>
        </div>
        <div className="flex gap-3 text-[14.5px] text-[#c5c5e4]">
          <span className="text-brand text-lg">✓</span>
          <span>Auto-scheduled preventive tasks with overdue alerts</span>
        </div>
        <div className="flex gap-3 text-[14.5px] text-[#c5c5e4]">
          <span className="text-brand text-lg">✓</span>
          <span>Repair tickets, vendors and warranties in one place</span>
        </div>
      </div>
    </main>
  );
}
