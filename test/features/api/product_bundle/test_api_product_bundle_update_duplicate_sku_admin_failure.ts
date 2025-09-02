import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProduct";
import type { IShoppingMallAiBackendProductBundle } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductBundle";

export async function test_api_product_bundle_update_duplicate_sku_admin_failure(
  connection: api.IConnection,
) {
  /**
   * Validate prohibition of duplicate SKU codes for product bundles by an
   * admin.
   *
   * Scenario:
   *
   * 1. Register and authenticate as a new admin user
   * 2. Create a product as the admin
   * 3. Create two product bundles (SKUs) under the same product with distinct SKU
   *    codes
   * 4. Attempt to update the second bundle's SKU to be the same as the first
   *    (should fail)
   * 5. Confirm that API rejects duplicate SKU within the same product scope
   */

  // 1. Register and authenticate as a new admin
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      password_hash: RandomGenerator.alphaNumeric(24),
      name: RandomGenerator.name(),
      email: typia.random<string & tags.Format<"email">>(),
      phone_number: null,
      is_active: true,
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });
  typia.assert(adminAuth);

  // 2. Create a product as admin
  const product =
    await api.functional.shoppingMallAiBackend.admin.products.create(
      connection,
      {
        body: {
          title: RandomGenerator.name(3),
          slug: RandomGenerator.alphaNumeric(16),
          description: RandomGenerator.content({ paragraphs: 2 }),
          product_type: "physical",
          business_status: "active",
          min_order_quantity: 1,
          max_order_quantity: 100,
          tax_code: RandomGenerator.alphaNumeric(6),
          sort_priority: 1,
        } satisfies IShoppingMallAiBackendProduct.ICreate,
      },
    );
  typia.assert(product);

  // 3. Create two bundles with unique SKU codes
  const firstBundle =
    await api.functional.shoppingMallAiBackend.admin.products.bundles.create(
      connection,
      {
        productId: product.id,
        body: {
          shopping_mall_ai_backend_products_id: product.id,
          bundle_name: RandomGenerator.name(2),
          sku_code: RandomGenerator.alphaNumeric(12),
          price: 10500,
          inventory_policy: "track",
          is_active: true,
        } satisfies IShoppingMallAiBackendProductBundle.ICreate,
      },
    );
  typia.assert(firstBundle);

  const secondBundle =
    await api.functional.shoppingMallAiBackend.admin.products.bundles.create(
      connection,
      {
        productId: product.id,
        body: {
          shopping_mall_ai_backend_products_id: product.id,
          bundle_name: RandomGenerator.name(2),
          sku_code: RandomGenerator.alphaNumeric(12),
          price: 12000,
          inventory_policy: "track",
          is_active: true,
        } satisfies IShoppingMallAiBackendProductBundle.ICreate,
      },
    );
  typia.assert(secondBundle);

  // 4. Attempt to update second bundle's SKU code to that of the first (should fail)
  await TestValidator.error(
    "should not allow updating bundle SKU to duplicate a sibling bundle's SKU (admin)",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.products.bundles.update(
        connection,
        {
          productId: product.id,
          bundleId: secondBundle.id,
          body: {
            sku_code: firstBundle.sku_code,
          } satisfies IShoppingMallAiBackendProductBundle.IUpdate,
        },
      );
    },
  );
}
