// Tipado del objeto window.gtag que inyecta GA4
declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

const send = (event: string, params: Record<string, unknown>) => {
  if (typeof window === 'undefined' || !window.gtag) return;
  window.gtag('event', event, params);
};

// ─── Eventos e-commerce GA4 estándar ────────────────────────

export const gaViewItem = (product: {
  id: string; name: string; price: number; category?: string;
}) => {
  send('view_item', {
    currency: 'COP',
    value: product.price,
    items: [{
      item_id:       product.id,
      item_name:     product.name,
      item_category: product.category,
      price:         product.price,
      quantity:      1,
    }],
  });
};

export const gaAddToCart = (product: {
  id: string; name: string; price: number; size: string; quantity: number;
}) => {
  send('add_to_cart', {
    currency: 'COP',
    value: product.price * product.quantity,
    items: [{
      item_id:       product.id,
      item_name:     product.name,
      item_variant:  product.size,
      price:         product.price,
      quantity:      product.quantity,
    }],
  });
};

export const gaBeginCheckout = (params: {
  value: number; items: { id: string; name: string; price: number; quantity: number }[];
}) => {
  send('begin_checkout', {
    currency: 'COP',
    value:    params.value,
    items:    params.items.map(i => ({
      item_id:   i.id,
      item_name: i.name,
      price:     i.price,
      quantity:  i.quantity,
    })),
  });
};

export const gaPurchase = (params: {
  orderId: string; value: number; tax: number;
  items: { id: string; name: string; price: number; quantity: number }[];
}) => {
  send('purchase', {
    transaction_id: params.orderId,
    currency:       'COP',
    value:          params.value,
    tax:            params.tax,
    items:          params.items.map(i => ({
      item_id:   i.id,
      item_name: i.name,
      price:     i.price,
      quantity:  i.quantity,
    })),
  });
};

export const gaSearch = (term: string) => {
  send('search', { search_term: term });
};
