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

// ─── Eventos secundarios (optimización de conversión) ────────

type GaItem = { id: string; name: string; price: number; quantity?: number };

const toGaItems = (items: GaItem[]) =>
  items.map((i) => ({
    item_id:   i.id,
    item_name: i.name,
    price:     i.price,
    ...(i.quantity ? { quantity: i.quantity } : {}),
  }));

export const gaViewCart = (params: { value: number; items: GaItem[] }) => {
  send('view_cart', { currency: 'COP', value: params.value, items: toGaItems(params.items) });
};

export const gaRemoveFromCart = (product: {
  id: string; name: string; price: number; size?: string; quantity: number;
}) => {
  send('remove_from_cart', {
    currency: 'COP',
    value: product.price * product.quantity,
    items: [{
      item_id:      product.id,
      item_name:    product.name,
      item_variant: product.size,
      price:        product.price,
      quantity:     product.quantity,
    }],
  });
};

export const gaAddToWishlist = (product: { id: string; name?: string; price?: number }) => {
  send('add_to_wishlist', {
    currency: 'COP',
    value:    product.price ?? 0,
    items:    [{ item_id: product.id, item_name: product.name, price: product.price }],
  });
};

export const gaViewItemList = (params: { listName: string; items: GaItem[] }) => {
  send('view_item_list', {
    item_list_name: params.listName,
    items: params.items.map((i, index) => ({
      item_id:   i.id,
      item_name: i.name,
      price:     i.price,
      index,
    })),
  });
};

export const gaSelectItem = (params: { listName: string; id: string; name: string; price: number }) => {
  send('select_item', {
    item_list_name: params.listName,
    items: [{ item_id: params.id, item_name: params.name, price: params.price }],
  });
};

export const gaAddShippingInfo = (params: { value: number; items: GaItem[] }) => {
  send('add_shipping_info', { currency: 'COP', value: params.value, items: toGaItems(params.items) });
};

export const gaAddPaymentInfo = (params: { value: number; items: GaItem[]; paymentType?: string }) => {
  send('add_payment_info', {
    currency:     'COP',
    value:        params.value,
    payment_type: params.paymentType ?? 'Wompi',
    items:        toGaItems(params.items),
  });
};

// user_id para audiencias y cross-device (se aplica a los eventos siguientes)
export const gaSetUserId = (userId: string | null) => {
  if (typeof window === 'undefined' || !window.gtag) return;
  window.gtag('set', { user_id: userId ?? undefined });
};
