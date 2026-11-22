ALTER TABLE "Inventory" ADD CONSTRAINT "Inventory_allocatedQuantity_nonnegative" CHECK ("allocatedQuantity">=0);
ALTER TABLE "ReservationItem" ADD CONSTRAINT "ReservationItem_quantity_positive" CHECK ("quantity">0);
ALTER TABLE "RefundOperation" ADD CONSTRAINT "RefundOperation_amount_positive" CHECK ("amountCents">0);
UPDATE "Supplier" SET "syncFrequency"='@15min' WHERE "syncFrequency" IS NULL OR "syncFrequency"='@daily';
