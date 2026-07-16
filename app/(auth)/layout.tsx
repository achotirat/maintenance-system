export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-wrap">
      <div className="flex-1 basis-[380px] bg-gradient-to-br from-[var(--hero1)] to-[var(--hero2)] text-white px-12 py-14 flex flex-col justify-center gap-[22px]">
        <div className="flex items-center gap-2.5">
          <div className="w-[34px] h-[34px] rounded-[9px] bg-brand grid place-items-center font-bold text-[17px]">
            D
          </div>
          <span className="font-bold text-[19px]">DueSpot</span>
        </div>
        <div className="text-[30px] font-bold leading-[1.25] max-w-[420px]">
          Never miss a maintenance date again.
          <br />
          ไม่พลาดทุกกำหนดบำรุงรักษา
        </div>
        <div className="flex flex-col gap-3 text-[14.5px] text-[#c5c5e4] max-w-[400px]">
          <div className="flex gap-2.5">
            <span>✓</span>
            <span>Track every device across hotels, villas, apartments and spas</span>
          </div>
          <div className="flex gap-2.5">
            <span>✓</span>
            <span>Auto-scheduled preventive tasks with overdue alerts</span>
          </div>
          <div className="flex gap-2.5">
            <span>✓</span>
            <span>Repair tickets, vendors and warranties in one place</span>
          </div>
        </div>
      </div>
      <div className="flex-1 basis-[380px] flex items-center justify-center p-12">
        {children}
      </div>
    </div>
  );
}
