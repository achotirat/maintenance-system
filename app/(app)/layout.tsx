import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AppShell } from "./app-shell";
import { ToastProvider } from "@/app/components/toast";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const initials = (session.user.name || session.user.email || "U")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <ToastProvider>
      <AppShell userName={session.user.name || ""} initials={initials}>
        {children}
      </AppShell>
    </ToastProvider>
  );
}
