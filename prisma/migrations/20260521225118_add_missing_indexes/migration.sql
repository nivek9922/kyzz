-- CreateIndex
CREATE INDEX "Order_isPaid_idx" ON "Order"("isPaid");

-- CreateIndex
CREATE INDEX "Order_paidAt_idx" ON "Order"("paidAt");

-- CreateIndex
CREATE INDEX "Order_shippingStatus_idx" ON "Order"("shippingStatus");

-- CreateIndex
CREATE INDEX "Product_categoryId_idx" ON "Product"("categoryId");
