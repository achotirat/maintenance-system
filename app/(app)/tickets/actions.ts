"use server";

import { revalidatePath } from "next/cache";
import { transitionTicket } from "@/lib/services/repair-tickets";

export async function advanceTicketAction(ticketId: string, newStatus: "IN_PROGRESS" | "RESOLVED") {
  await transitionTicket({ ticketId, status: newStatus });
  revalidatePath("/tickets");
  revalidatePath("/dashboard");
}
