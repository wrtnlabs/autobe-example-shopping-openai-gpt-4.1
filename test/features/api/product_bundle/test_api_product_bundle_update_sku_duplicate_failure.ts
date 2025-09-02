import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendSeller";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProduct";
import type { IShoppingMallAiBackendProductBundle } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductBundle";

export async function test_api_product_bundle_update_sku_duplicate_failure(
  connection: api.IConnection,
) {
  /**
   * Test update failure when attempting to set a product bundle's SKU to a code
   * that already exists on another bundle of the same product.
   *
   * Business context:
   *
   * - SKU codes must be unique per product.
   * - Attempting to update Bundle B's SKU to Bundle A's code should result in a
   *   backend validation error.
   *
   * Workflow:
   *
   * 1. Register a new seller and obtain authentication context.
   * 2. Create a new product under the seller.
   * 3. Create Bundle A with unique SKU code 'SKU_A'.
   * 4. Create Bundle B with unique SKU code 'SKU_B'.
   * 5. Attempt to update Bundle B, setting its sku_code to 'SKU_A', expecting
   *    failure due to SKU duplication.
   */

  // 1. Seller registration and authentication
  const sellerEmail = `${RandomGenerator.alphabets(12)}@business.com`;
  const sellerRegNum = RandomGenerator.alphaNumeric(12);
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      business_registration_number: sellerRegNum,
      name: RandomGenerator.name(),
    } satisfies IShoppingMallAiBackendSeller.ICreate,
  });
  typia.assert(seller);

  // 2. Product creation under this seller
  const productInput = {
    title: RandomGenerator.name(3),
    slug: RandomGenerator.alphaNumeric(16),
    description: RandomGenerator.content({ paragraphs: 2 }),
    product_type: RandomGenerator.pick(["physical", "digital"] as const),
    business_status: "active",
    min_order_quantity: 1,
    max_order_quantity: 10,
    tax_code: RandomGenerator.alphaNumeric(8),
    sort_priority: 1,
  } satisfies IShoppingMallAiBackendProduct.ICreate;
  const product =
    await api.functional.shoppingMallAiBackend.seller.products.create(
      connection,
      {
        body: productInput,
      },
    );
  typia.assert(product);

  // 3. Create Bundle A
  const bundleASku = RandomGenerator.alphaNumeric(10);
  const bundleA =
    await api.functional.shoppingMallAiBackend.seller.products.bundles.create(
      connection,
      {
        productId: product.id,
        body: {
          shopping_mall_ai_backend_products_id: product.id,
          bundle_name: RandomGenerator.name(2),
          sku_code: bundleASku,
          price: 10000,
          inventory_policy: "track",
          is_active: true,
        } satisfies IShoppingMallAiBackendProductBundle.ICreate,
      },
    );
  typia.assert(bundleA);

  // 4. Create Bundle B
  const bundleBSku = RandomGenerator.alphaNumeric(10);
  const bundleB =
    await api.functional.shoppingMallAiBackend.seller.products.bundles.create(
      connection,
      {
        productId: product.id,
        body: {
          shopping_mall_ai_backend_products_id: product.id,
          bundle_name: RandomGenerator.name(2),
          sku_code: bundleBSku,
          price: 12000,
          inventory_policy: "track",
          is_active: true,
        } satisfies IShoppingMallAiBackendProductBundle.ICreate,
      },
    );
  typia.assert(bundleB);

  // 5. Attempt to update Bundle B's SKU to match Bundle A's (should fail)
  await TestValidator.error(
    "updating bundle B's SKU to duplicate of bundle A must fail",
    async () => {
      await api.functional.shoppingMallAiBackend.seller.products.bundles.update(
        connection,
        {
          productId: product.id,
          bundleId: bundleB.id,
          body: {
            sku_code: bundleASku,
          } satisfies IShoppingMallAiBackendProductBundle.IUpdate,
        },
      );
    },
  );
}
