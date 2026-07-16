"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode } from "react";
import { DarkModeToggle } from "@/app/components/dark-mode-toggle";
import { signOutAction } from "./sign-out-action";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/properties", label: "Properties" },
  { href: "/tickets", label: "Tickets" },
  { href: "/vendors", label: "Vendors" },
  { href: "/staff", label: "Staff" },
];

const MOBILE_TABS = [
  { href: "/dashboard", icon: "🏠", label: "หน้าหลัก" },
  { href: "/properties", icon: "🏢", label: "อาคาร" },
  { href: "/tickets", icon: "🎫", label: "แจ้งซ่อม" },
  { href: "/vendors", icon: "📇", label: "ผู้รับเหมา" },
  { href: "/staff", icon: "👥", label: "ทีม" },
];

function isActiveRoute(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname.startsWith(href);
}

export function AppShell({
  userName,
  initials,
  children,
}: {
  userName: string;
  initials: string;
  children: ReactNode;
}) {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop nav */}
      <div className="hidden md:flex items-center justify-between px-7 py-[13px] bg-[var(--nav)] sticky top-0 z-40">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-brand text-white grid place-items-center font-bold text-sm">
            D
          </div>
          <span className="font-bold text-[15px] text-white">DueSpot</span>
        </div>
        <div className="flex gap-1">
          {NAV_ITEMS.map((n) => {
            const active = isActiveRoute(pathname, n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                className={`text-[13px] font-semibold px-[13px] py-[7px] rounded-lg transition-colors ${
                  active
                    ? "bg-blue-500/25 text-white"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                }`}
              >
                {n.label}
              </Link>
            );
          })}
        </div>
        <div className="flex items-center gap-3">
          <DarkModeToggle />
          <button
            onClick={() => signOutAction()}
            title="Sign out"
            className="border-none p-0 bg-transparent"
          >
            <div className="w-[30px] h-[30px] rounded-full bg-amber-200 grid place-items-center text-xs font-semibold text-amber-800">
              {initials}
            </div>
          </button>
        </div>
      </div>

      {/* Mobile header */}
      <div className="flex md:hidden items-center justify-between px-[18px] py-[14px] bg-[var(--nav)] sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <div className="w-[26px] h-[26px] rounded-[7px] bg-brand text-white grid place-items-center font-bold text-[13px]">
            D
          </div>
          <span className="font-bold text-[14.5px] text-white">DueSpot</span>
        </div>
        <div className="flex items-center gap-2.5">
          <DarkModeToggle />
          <button
            onClick={() => signOutAction()}
            className="border-none p-0 bg-transparent"
          >
            <div className="w-7 h-7 rounded-full bg-amber-200 grid place-items-center text-[11px] font-semibold text-amber-800">
              {initials}
            </div>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="pb-[100px] md:pb-[30px]">{children}</div>

      {/* Mobile bottom tabs */}
      <div className="flex md:hidden fixed bottom-0 left-0 right-0 bg-[var(--card)] border-t border-line px-1.5 pt-2 pb-5 z-[45]">
        {MOBILE_TABS.map((tb) => {
          const active = isActiveRoute(pathname, tb.href);
          return (
            <Link
              key={tb.href}
              href={tb.href}
              className="flex-1 text-center py-0.5"
            >
              <div
                className="text-[19px]"
                style={{ opacity: active ? 1 : 0.45 }}
              >
                {tb.icon}
              </div>
              <div
                className="text-[10.5px] font-semibold"
                style={{ color: active ? "#5b5bd6" : "var(--tx3)" }}
              >
                {tb.label}
              </div>
            </Link>
          );
        })}
      </div>
    </>
  );
}
