ALTER TABLE "Supplier" ADD COLUMN "orderAuthToken" TEXT,
  ADD COLUMN "orderWebhookToken" TEXT,
  ADD COLUMN "orderForwardingEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Order" ADD COLUMN "stripeCheckoutSessionId" TEXT,
  ADD COLUMN "shippingAddressJson" TEXT,
  ADD COLUMN "fulfillmentHold" TEXT;
CREATE UNIQUE INDEX "Order_stripeCheckoutSessionId_key" ON "Order"("stripeCheckoutSessionId");
ALTER TABLE "OrderItem" ADD COLUMN "supplierId" TEXT,
  ADD COLUMN "supplierProductId" TEXT;
CREATE TABLE "SupplierDispatch" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "supplierId" TEXT NOT NULL,
  "requestJson" TEXT NOT NULL,
  "endpointUrl" TEXT,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "supplierOrderId" TEXT,
  "supplierStatus" TEXT,
  "trackingNumber" TEXT,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "lastAttemptAt" TIMESTAMP(3),
  "sentAt" TIMESTAMP(3),
  "lastError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SupplierDispatch_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SupplierDispatch_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "SupplierDispatch_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "SupplierDispatch_orderId_supplierId_key" ON "SupplierDispatch"("orderId", "supplierId");
CREATE UNIQUE INDEX "SupplierDispatch_supplierId_supplierOrderId_key" ON "SupplierDispatch"("supplierId", "supplierOrderId");
CREATE INDEX "SupplierDispatch_status_lastAttemptAt_idx" ON "SupplierDispatch"("status", "lastAttemptAt");
