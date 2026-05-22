export const TAX_RATE = 0.19; // 19% IVA (normativa colombiana)

export const FREE_SHIPPING_THRESHOLD = 500_000; // COP — por encima de esto el envío es gratis
export const SHIPPING_COST           =  17_000; // COP — costo de envío estándar

export const VALID_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'] as const;

export const LOW_STOCK_THRESHOLD = 5;  // unidades — stock crítico; se alerta al admin
export const REORDER_POINT       = 10; // unidades — punto de reorden; conviene reabastecer
