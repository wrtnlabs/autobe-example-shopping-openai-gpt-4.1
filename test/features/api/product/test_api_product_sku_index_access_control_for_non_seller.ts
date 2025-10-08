import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductSku";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validate access control so a non-owner seller cannot list/search SKUs for a
 * product owned by another seller.
 *
 * 1. Seller A joins (auth.seller.join)
 * 2. Admin creates a product category (shoppingMall.admin.categories.create)
 * 3. Seller A creates a product (shoppingMall.seller.products.create)
 * 4. Seller B joins (auth.seller.join)
 * 5. Seller B attempts to list/search SKUs of Seller A's product using PATCH
 *    /shoppingMall/seller/products/{productId}/skus endpoint
 * 6. Validation: Seller B receives either an error or empty SKU list for non-owned
 *    product
 */
export async function test_api_product_sku_index_access_control_for_non_seller(
  connection: api.IConnection,
) {
  // 1. Seller A joins
  const sellerA_email = typia.random<string & tags.Format<"email">>();
  const sellerA: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerA_email,
        password: RandomGenerator.alphaNumeric(10),
        business_name: RandomGenerator.paragraph({ sentences: 2 }),
        contact_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        kyc_document_uri: null,
        business_registration_number: RandomGenerator.alphaNumeric(12),
      } satisfies IShoppingMallSeller.IJoin,
    });
  typia.assert(sellerA);

  // 2. Admin creates a product category
  // To simulate as admin, use new connection with empty headers
  const adminConn: api.IConnection = { ...connection, headers: {} };
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(adminConn, {
      body: {
        name_ko: RandomGenerator.paragraph({ sentences: 2 }),
        name_en: RandomGenerator.paragraph({ sentences: 2 }),
        display_order: 1,
        is_active: true,
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(category);

  // 3. Seller A creates a product
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: {
        shopping_mall_seller_id: sellerA.id,
        shopping_mall_category_id: category.id,
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        is_active: true,
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(product);

  // 4. Seller B joins
  const sellerB_email = typia.random<string & tags.Format<"email">>();
  const sellerB: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerB_email,
        password: RandomGenerator.alphaNumeric(10),
        business_name: RandomGenerator.paragraph({ sentences: 2 }),
        contact_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        kyc_document_uri: null,
        business_registration_number: RandomGenerator.alphaNumeric(12),
      } satisfies IShoppingMallSeller.IJoin,
    });
  typia.assert(sellerB);

  // 5. Seller B attempts to list/search SKUs for Seller A's product
  const page: IPageIShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.index(connection, {
      productId: product.id,
      body: {},
    });
  typia.assert(page);
  TestValidator.predicate(
    "Seller B cannot access SKUs for Seller A's product (should be empty)",
    page.data.length === 0,
  );
}
