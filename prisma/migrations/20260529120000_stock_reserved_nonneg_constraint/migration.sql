-- Backstop de integridad de stock: ni `stock` ni `reserved` pueden ser negativos.
-- Un `reserved` negativo infla el disponible (available = stock - reserved) y
-- habilita sobreventa real. El código ya lo evita con GREATEST(..., 0), pero este
-- constraint es la garantía a nivel BD para cualquier ruta (incluido SQL manual).

-- Clamp defensivo de cualquier valor negativo preexistente antes de crear el
-- constraint (idempotente y seguro aunque producción tenga datos inconsistentes).
UPDATE "ProductVariant" SET "reserved" = 0 WHERE "reserved" < 0;
UPDATE "ProductVariant" SET "stock"    = 0 WHERE "stock"    < 0;

ALTER TABLE "ProductVariant"
  ADD CONSTRAINT "ProductVariant_stock_reserved_nonneg"
  CHECK ("stock" >= 0 AND "reserved" >= 0);
