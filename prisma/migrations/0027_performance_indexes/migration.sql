-- Performance indexes for common query patterns
-- Quote: filtered by status on dashboard, list pages; sorted by createdAt
CREATE INDEX "Quote_userId_status_idx" ON "Quote"("userId", "status");
CREATE INDEX "Quote_userId_createdAt_idx" ON "Quote"("userId", "createdAt");

-- Job: filtered by status on dashboard, kanban; sorted by createdAt
CREATE INDEX "Job_userId_status_idx" ON "Job"("userId", "status");
CREATE INDEX "Job_userId_createdAt_idx" ON "Job"("userId", "createdAt");

-- Invoice: filtered by status on list page; sorted by createdAt
CREATE INDEX "Invoice_userId_status_idx" ON "Invoice"("userId", "status");
CREATE INDEX "Invoice_userId_createdAt_idx" ON "Invoice"("userId", "createdAt");

-- Material: low-stock queries filter by stockQty on dashboard
CREATE INDEX "Material_userId_stockQty_idx" ON "Material"("userId", "stockQty");

-- Consumable: same low-stock pattern
CREATE INDEX "Consumable_userId_stockQty_idx" ON "Consumable"("userId", "stockQty");
