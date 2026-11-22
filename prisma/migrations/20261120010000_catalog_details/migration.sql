ALTER TABLE "Product" ADD COLUMN "detailsJson" TEXT,
  ADD COLUMN "supplierCategoryPath" TEXT,
  ADD COLUMN "catalogReviewedAt" TIMESTAMP(3),
  ADD COLUMN "imagesVerifiedAt" TIMESTAMP(3);
ALTER TABLE "Inventory" ADD COLUMN "syncedAt" TIMESTAMP(3);
CREATE UNIQUE INDEX "Product_supplierId_supplierProductId_key" ON "Product"("supplierId", "supplierProductId");
