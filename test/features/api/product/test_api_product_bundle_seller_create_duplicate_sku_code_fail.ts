import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendSeller";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProduct";
import type { IShoppingMallAiBackendProductBundle } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductBundle";

export async function test_api_product_bundle_seller_create_duplicate_sku_code_fail(
  connection: api.IConnection,
) {
  /**
   * Validate that sellers cannot create two bundles (SKU/variant options) under
   * the same product with duplicate SKU codes.
   *
   * This scenario protects catalog and inventory data integrity by preventing
   * multiple variants of a product from being assigned the same SKU code. It
   * ensures a business constraint at the API layer for proper seller
   * compliance.
   *
   * Workflow:
   *
   * 1. Seller registers and authenticates (obtains JWT).
   * 2. Seller creates a new product as the bundle parent.
   * 3. Seller adds the first bundle with a unique SKU code (should succeed).
   * 4. Seller attempts to add a second bundle to the same product **using the same
   *    sku_code** (should fail with uniqueness violation).
   * 5. Validate that the error is thrown and ensure the system rejects duplicate
   *    SKU creation.
   */

  // 1. Register and authenticate as seller for business API access
  const sellerEmail = `${RandomGenerator.alphaNumeric(8)}@business.com`;
  const sellerReg = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      business_registration_number: RandomGenerator.alphaNumeric(10),
      name: RandomGenerator.name(),
    } satisfies IShoppingMallAiBackendSeller.ICreate,
  });
  typia.assert(sellerReg);
  typia.assert(sellerReg.seller);
  typia.assert(sellerReg.token);

  // 2. Create a new product as this seller
  const product =
    await api.functional.shoppingMallAiBackend.seller.products.create(
      connection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 3 }),
          slug: RandomGenerator.alphaNumeric(12),
          description: RandomGenerator.content({
            paragraphs: 2,
            sentenceMin: 7,
            sentenceMax: 15,
            wordMin: 4,
            wordMax: 9,
          }),
          product_type: "physical",
          business_status: "active",
          min_order_quantity: 1,
          max_order_quantity: 10,
          tax_code: RandomGenerator.alphaNumeric(4),
          sort_priority: 1 + Math.floor(Math.random() * 10),
        } satisfies IShoppingMallAiBackendProduct.ICreate,
      },
    );
  typia.assert(product);

  // 3. Add the first bundle with a unique sku_code
  const sharedSkuCode = RandomGenerator.alphaNumeric(10);
  const firstBundleInput: IShoppingMallAiBackendProductBundle.ICreate = {
    shopping_mall_ai_backend_products_id: product.id,
    bundle_name: RandomGenerator.name(2),
    sku_code: sharedSkuCode,
    price: 1000 + Math.floor(Math.random() * 90000),
    inventory_policy: "track",
    is_active: true,
  };
  const firstBundle =
    await api.functional.shoppingMallAiBackend.seller.products.bundles.create(
      connection,
      {
        productId: product.id,
        body: firstBundleInput,
      },
    );
  typia.assert(firstBundle);
  TestValidator.equals(
    "first bundle sku_code should match requested SKU",
    firstBundle.sku_code,
    sharedSkuCode,
  );

  // 4. Try to add a second bundle to same product with the same sku_code (should fail)
  const secondBundleInput: IShoppingMallAiBackendProductBundle.ICreate = {
    shopping_mall_ai_backend_products_id: product.id,
    bundle_name: RandomGenerator.name(2),
    sku_code: sharedSkuCode, // intentionally duplicate
    price: 2000 + Math.floor(Math.random() * 90000),
    inventory_policy: "track",
    is_active: true,
  };
  await TestValidator.error(
    "should fail to create bundle with duplicate SKU code for product",
    async () => {
      await api.functional.shoppingMallAiBackend.seller.products.bundles.create(
        connection,
        {
          productId: product.id,
          body: secondBundleInput,
        },
      );
    },
  );
}
