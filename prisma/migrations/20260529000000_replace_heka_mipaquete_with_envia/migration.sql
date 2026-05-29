-- Reemplaza heka y mipaquete por envia en el enum Carrier.
-- No hay registros con esos valores en dev, pero migramos por si acaso.

-- Paso 1: Migrar cualquier fila residual a 'manual' antes de cambiar el tipo
UPDATE "Shipment" SET "carrier" = 'manual' WHERE "carrier" IN ('heka', 'mipaquete');

-- Paso 2: Crear nuevo tipo sin heka/mipaquete y con envia
CREATE TYPE "Carrier_new" AS ENUM ('envia', 'interrapidisimo', 'servientrega', 'coordinadora', 'tcc', 'mensajeros_urbanos', 'noventa_y_nueve', 'manual');

-- Paso 3: Migrar la columna al nuevo tipo
ALTER TABLE "Shipment"
  ALTER COLUMN "carrier" DROP DEFAULT;

ALTER TABLE "Shipment"
  ALTER COLUMN "carrier" TYPE "Carrier_new" USING "carrier"::text::"Carrier_new";

ALTER TABLE "Shipment"
  ALTER COLUMN "carrier" SET DEFAULT 'manual'::"Carrier_new";

-- Paso 4: Reemplazar el tipo antiguo
DROP TYPE "Carrier";
ALTER TYPE "Carrier_new" RENAME TO "Carrier";
