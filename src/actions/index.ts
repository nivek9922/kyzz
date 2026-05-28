
// ─── Address ────────────────────────────────────────────────
export { deleteUserAddress } from './address/delete-user-address';
export { getUserAddress }    from './address/get-user-address';
export { setUserAddress }    from './address/set-user-address';

// ─── Auth ────────────────────────────────────────────────────
export { authenticate, login, loginWithGoogle } from './auth/login';
export { logout }              from './auth/logout';
export { registerUser }        from './auth/register';

// ─── Category ───────────────────────────────────────────────
export { getCategories }      from './category/get-categories';
export { createCategory }     from './category/create-category';
export { updateCategory }     from './category/update-category';
export { deleteCategory }     from './category/delete-category';
export { updateCategoryImage }      from './category/update-category-image';
export { updateCategoryImageStyle } from './category/update-category-image-style';

// ─── Country ────────────────────────────────────────────────
export { getCountries } from './country/get-countries';

// ─── Order ──────────────────────────────────────────────────
export { placeOrder }                from './order/place-order';
export { createManualOrder,
         getOrderableVariants }      from './order/create-manual-order';
export type { OrderableVariant }     from './order/create-manual-order';
export { getOrderById }              from './order/get-order-by-id';
export { getPaginatedOrders }        from './order/get-paginated-orders';
export { getOrdersByUser }           from './order/get-orders-by-user';
export { markOrderAsPaid }           from './order/mark-order-as-paid';
export { uploadProofImage }          from './order/upload-proof-image';
export { updateOrderShipping,
         confirmCodOrder }           from './order/update-order-shipping';
export { cancelUnpaidOrders,
         getCancellableOrdersCount } from './order/cancel-unpaid-orders';

// ─── Payments ───────────────────────────────────────────────
export { wompiCreatePayment } from './payments/wompi-create-payment';
export { wompiCheckPayment }  from './payments/wompi-check-payment';

// ─── Product ────────────────────────────────────────────────
export { deleteProduct }                   from './product/delete-product';
export { deleteProductImage }              from './product/delete-product-image';
export { createUpdateProduct }             from './product/create-update-product';
export { toggleProductFeatured }           from './product/toggle-product-featured';
export { toggleProductArchived }           from './product/archive-product';
export { getFeaturedProducts }             from './product/get-featured-products';
export { getFeaturedCount }                from './product/get-featured-count';
export { getBestSellers }                  from './product/get-best-sellers';
export { getNewArrivals }                  from './product/get-new-arrivals';
export { getFeaturedProductsPaginated }    from './product/get-featured-products-paginated';
export { getProductBySlug }                from './product/get-product-by-slug';
export { getStockBySlug }                  from './product/get-stock-by-slug';
export { getPaginatedProductsWithImages }  from './product/product-pagination';
export { searchProducts }                  from './product/search-products';
export { searchProductsQuick }             from './product/search-products-quick';
export type { QuickSearchResult }          from './product/search-products-quick';
export { getTrendingProducts }             from './product/get-trending-products';
export { convertProductToNoColor }         from './product/convert-product-type';
export { addProductColor,
         removeProductColor,
         addColorImage,
         removeColorImage,
         getProductColors as getProductColorsByProductId } from './product/manage-product-color';
export { getProductVariants,
         updateProductVariants,
         resolveVariant }                                  from './product/manage-product-variants';
export type { VariantInput }                                from './product/manage-product-variants';

// ─── Color Palette ───────────────────────────────────────────
export { getColorPalette }      from './color-palette/get-color-palette';
export { createPaletteColor }   from './color-palette/create-palette-color';
export { updatePaletteColor }   from './color-palette/update-palette-color';
export { deletePaletteColor }   from './color-palette/delete-palette-color';

// ─── Site Config ─────────────────────────────────────────────
export { getSiteConfig }                  from './site/get-site-config';
export { updateSiteConfig }               from './site/update-site-config';
export { getCloudinaryVideoSignature }    from './site/get-cloudinary-video-signature';
export { saveHeroVideo }                  from './site/save-hero-video';
export { subscribeNewsletter }            from './site/subscribe-newsletter';
export { sendNewsletter }                 from './site/send-newsletter';
export type { NewsletterProduct }         from './site/send-newsletter';

// ─── Returns ────────────────────────────────────────────────
export { createReturnRequest,
         createReturnRequestAdmin } from './return/create-return-request';
export { updateReturnStatus,
         getReturnRequests }        from './return/update-return-status';

// ─── User ───────────────────────────────────────────────────
export { changeUserRole }      from './user/change-user-role';
export { deleteUser }          from './user/delete-user';
export { getPaginatedUsers }   from './user/get-paginater-users';
export { changeOwnPassword }   from './user/change-own-password';
