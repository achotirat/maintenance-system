-- CreateTable
CREATE TABLE "devices" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "purchaseDate" TIMESTAMP(3),
    "purchaseVendor" TEXT,
    "warrantyMonths" INTEGER,
    "warrantyExpiresAt" TIMESTAMP(3),
    "receiptPhotoUrl" TEXT,
    "notes" TEXT,
    "archivedAt" TIMESTAMP(3),
    "replacesDeviceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "devices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "devices_replacesDeviceId_key" ON "devices"("replacesDeviceId");

-- AddForeignKey
ALTER TABLE "devices" ADD CONSTRAINT "devices_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devices" ADD CONSTRAINT "devices_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devices" ADD CONSTRAINT "devices_replacesDeviceId_fkey" FOREIGN KEY ("replacesDeviceId") REFERENCES "devices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

