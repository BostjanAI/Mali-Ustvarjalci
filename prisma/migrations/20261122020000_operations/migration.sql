-- AlterTable
ALTER TABLE "Supplier" ADD COLUMN     "orderAdapter" TEXT NOT NULL DEFAULT 'generic-v1',
ADD COLUMN     "orderApiNextAt" TIMESTAMP(3),
ADD COLUMN     "orderApiUsername" TEXT,
ADD COLUMN     "shippingServicesJson" TEXT;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "costPriceCents" INTEGER,
ADD COLUMN     "priceManaged" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "stockManaged" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "supplierPriceCents" INTEGER;

-- AlterTable
ALTER TABLE "Inventory" ADD COLUMN     "allocatedQuantity" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "refundState" TEXT NOT NULL DEFAULT 'none',
ADD COLUMN     "reservationId" TEXT,
ADD COLUMN     "shippingServiceJson" TEXT;

-- AlterTable
ALTER TABLE "SupplierDispatch" ADD COLUMN     "labelUrl" TEXT,
ADD COLUMN     "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "reconciliationNote" TEXT,
ADD COLUMN     "reconciliationStatus" TEXT NOT NULL DEFAULT 'none',
ADD COLUMN     "retryAlertedAt" TIMESTAMP(3),
ADD COLUMN     "stockAccountedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "CheckoutReservation" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'creating',
    "stripeSessionId" TEXT,
    "cartJson" TEXT NOT NULL,
    "stripeRequestJson" TEXT,
    "shippingServiceJson" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CheckoutReservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReservationItem" (
    "id" TEXT NOT NULL,
    "reservationId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "supplierId" TEXT,
    "quantity" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'held',

    CONSTRAINT "ReservationItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefundOperation" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "requestKey" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'requested',
    "stripeRefundId" TEXT,
    "requestedBy" TEXT NOT NULL,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RefundOperation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OperationsAlert" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "orderId" TEXT,
    "dispatchId" TEXT,
    "acknowledgedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OperationsAlert_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CheckoutReservation_stripeSessionId_key" ON "CheckoutReservation"("stripeSessionId");

-- CreateIndex
CREATE INDEX "CheckoutReservation_status_expiresAt_idx" ON "CheckoutReservation"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "ReservationItem_productId_status_idx" ON "ReservationItem"("productId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ReservationItem_reservationId_productId_key" ON "ReservationItem"("reservationId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "RefundOperation_requestKey_key" ON "RefundOperation"("requestKey");

-- CreateIndex
CREATE UNIQUE INDEX "RefundOperation_stripeRefundId_key" ON "RefundOperation"("stripeRefundId");

-- CreateIndex
CREATE INDEX "RefundOperation_orderId_status_idx" ON "RefundOperation"("orderId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "OperationsAlert_key_key" ON "OperationsAlert"("key");

-- CreateIndex
CREATE UNIQUE INDEX "Order_reservationId_key" ON "Order"("reservationId");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "CheckoutReservation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReservationItem" ADD CONSTRAINT "ReservationItem_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "CheckoutReservation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefundOperation" ADD CONSTRAINT "RefundOperation_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
