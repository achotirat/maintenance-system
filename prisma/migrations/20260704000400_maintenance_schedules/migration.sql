-- CreateTable
CREATE TABLE "maintenance_schedules" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "taskDescription" TEXT NOT NULL,
    "intervalDays" INTEGER NOT NULL,
    "lastCompletedAt" TIMESTAMP(3),
    "nextDueAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "maintenance_schedules_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "maintenance_schedules" ADD CONSTRAINT "maintenance_schedules_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "devices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

