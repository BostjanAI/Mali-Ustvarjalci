ALTER TABLE "CheckoutReservation" ADD COLUMN "reconcileAfter" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 ADD COLUMN "reconcileAttempts" INTEGER NOT NULL DEFAULT 0,
 ADD COLUMN "reconciliationError" TEXT;
CREATE INDEX "CheckoutReservation_status_reconcileAfter_idx" ON "CheckoutReservation"("status","reconcileAfter");
CREATE TABLE "TrackingNotification" (
 "id" TEXT NOT NULL,
 "dispatchId" TEXT NOT NULL,
 "trackingNumber" TEXT NOT NULL,
 "status" TEXT NOT NULL DEFAULT 'pending',
 "attempts" INTEGER NOT NULL DEFAULT 0,
 "attemptToken" TEXT,
 "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "sentAt" TIMESTAMP(3),
 "lastError" TEXT,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "TrackingNotification_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "TrackingNotification_dispatchId_fkey" FOREIGN KEY ("dispatchId") REFERENCES "SupplierDispatch"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "TrackingNotification_dispatchId_trackingNumber_key" ON "TrackingNotification"("dispatchId","trackingNumber");
CREATE INDEX "TrackingNotification_status_nextAttemptAt_idx" ON "TrackingNotification"("status","nextAttemptAt");
