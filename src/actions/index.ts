
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
export { placeOrder }           from './order/place-order';
export { getOrderById }         from './order/get-order-by-id';
export { getPaginatedOrders }   from './order/get-paginated-orders';
export { getOrdersByUser }      from './order/get-orders-by-user';

// ─── Payments ───────────────────────────────────────────────
export { setTransactionId }    from './payments/set-transaction-id';
export { paypalCheckPayment }  from './payments/paypal-check-payment';

// ─── Product ────────────────────────────────────────────────
export { deleteProductImage }              from './product/delete-product-image';
export { createUpdateProduct }             from './product/create-update-product';
export { getFeaturedProducts }             from './product/get-featured-products';
export { getProductBySlug }                from './product/get-product-by-slug';
export { getStockBySlug }                  from './product/get-stock-by-slug';
export { getPaginatedProductsWithImages }  from './product/product-pagination';
export { searchProducts }                  from './product/search-products';

// ─── User ───────────────────────────────────────────────────
export { changeUserRole }   from './user/change-user-role';
export { getPaginatedUsers } from './user/get-paginater-users';
