
// ─── Address ────────────────────────────────────────────────
export { deleteUserAddress } from './address/delete-user-address';
export { getUserAddress }    from './address/get-user-address';
export { setUserAddress }    from './address/set-user-address';

// ─── Auth ────────────────────────────────────────────────────
export { authenticate, login } from './auth/login';
export { logout }              from './auth/logout';
export { registerUser }        from './auth/register';

// ─── Category ───────────────────────────────────────────────
export { getCategories } from './category/get-categories';

// ─── Country ────────────────────────────────────────────────
export { getCountries } from './country/get-countries';

// ─── Order ──────────────────────────────────────────────────
export { placeOrder }                from './order/place-order';
export { getOrderById }              from './order/get-order-by-id';
export { getPaginatedOrders }        from './order/get-paginated-orders';
export { getOrdersByUser }           from './order/get-orders-by-user';
export { markOrderAsPaid }           from './order/mark-order-as-paid';
export { cancelUnpaidOrders,
         getCancellableOrdersCount } from './order/cancel-unpaid-orders';

// ─── Payments ───────────────────────────────────────────────
export { setTransactionId }    from './payments/set-transaction-id';
export { paypalCheckPayment }  from './payments/paypal-check-payment';

// ─── Product ────────────────────────────────────────────────
export { deleteProduct }                   from './product/delete-product';
export { deleteProductImage }              from './product/delete-product-image';
export { createUpdateProduct }             from './product/create-update-product';
export { toggleProductFeatured }           from './product/toggle-product-featured';
export { getFeaturedProducts }             from './product/get-featured-products';
export { getFeaturedProductsPaginated }    from './product/get-featured-products-paginated';
export { getProductBySlug }                from './product/get-product-by-slug';
export { getStockBySlug }                  from './product/get-stock-by-slug';
export { getPaginatedProductsWithImages }  from './product/product-pagination';
export { searchProducts }                  from './product/search-products';

// ─── Site Config ─────────────────────────────────────────────
export { getSiteConfig }    from './site/get-site-config';
export { updateSiteConfig } from './site/update-site-config';

// ─── User ───────────────────────────────────────────────────
export { changeUserRole }    from './user/change-user-role';
export { deleteUser }        from './user/delete-user';
export { getPaginatedUsers } from './user/get-paginater-users';
