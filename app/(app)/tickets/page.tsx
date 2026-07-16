import { getPrimaryOrganizationId } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { TicketBoard } from "./ticket-board";

export default async function TicketsPage() {
  const organizationId = await getPrimaryOrganizationId();

  const tickets = await prisma.repairTicket.findMany({
    where: {
      device: { property: { organizationId } },
    },
    include: {
      device: { include: { property: true } },
      vendor: true,
    },
    orderBy: { openedAt: "desc" },
  });

  const serialized = tickets.map((t) => ({
    id: t.id,
    deviceId: t.deviceId,
    status: t.status,
    problem: t.problemDescription,
    deviceName: `${t.device.category}: ${t.device.brand} ${t.device.model}`,
    propertyName: t.device.property.name,
    vendorName: t.vendor?.name || "Unassigned · ยังไม่มอบหมาย",
    cost: t.cost ? Number(t.cost) : null,
    openedAt: t.openedAt.toISOString(),
  }));

  return <TicketBoard tickets={serialized} />;
}
