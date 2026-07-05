-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED');

-- CreateTable
CREATE TABLE "repair_tickets" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "status" "TicketStatus" NOT NULL DEFAULT 'OPEN',
    "problemDescription" TEXT NOT NULL,
    "vendorId" TEXT,
    "cost" DECIMAL(10,2),
    "resolutionNotes" TEXT,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "repair_tickets_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "repair_tickets" ADD CONSTRAINT "repair_tickets_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "devices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repair_tickets" ADD CONSTRAINT "repair_tickets_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

