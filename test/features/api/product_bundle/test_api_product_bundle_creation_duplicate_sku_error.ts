import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProduct";
import type { IShoppingMallAiBackendProductBundle } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductBundle";

export async function test_api_product_bundle_creation_duplicate_sku_error(
  connection: api.IConnection,
) {
  /**
   * Validates that creating a product bundle with a SKU code already used by
   * another bundle for the same product results in a validation error.
   *
   * Workflow:
   *
   * 1. Register an admin account to obtain authentication credentials (required
   *    for product and bundle management).
   * 2. As authenticated admin, create a product with all required fields.
   * 3. Create the first bundle/variant for this product using a unique SKU code.
   * 4. Attempt to create another bundle for the same product, reusing the same SKU
   *    code -- expecting a duplication error.
   *
   * The test ensures that SKU code uniqueness is enforced at the API level per
   * product, and the second call fails as required.
   */

  // 1. Register a new admin account to establish authentication context
  const adminAuthorized = await api.functional.auth.admin.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      password_hash: RandomGenerator.alphaNumeric(32),
      name: RandomGenerator.name(),
      email: typia.random<string & tags.Format<"email">>(),
      phone_number: RandomGenerator.mobile(),
      is_active: true,
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });
  typia.assert(adminAuthorized);

  // 2. Create a new product as the admin
  const product =
    await api.functional.shoppingMallAiBackend.admin.products.create(
      connection,
      {
        body: {
          title: RandomGenerator.name(3),
          slug: RandomGenerator.alphaNumeric(12),
          description: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 5,
            sentenceMax: 10,
          }),
          product_type: "physical",
          business_status: "active",
          min_order_quantity: 1,
          max_order_quantity: 100,
          tax_code: "TAX-001",
          sort_priority: 10,
        } satisfies IShoppingMallAiBackendProduct.ICreate,
      },
    );
  typia.assert(product);

  // 3. Create the first product bundle with a unique SKU code
  const skuCode = "sku-1234";
  const firstBundle =
    await api.functional.shoppingMallAiBackend.admin.products.bundles.create(
      connection,
      {
        productId: product.id,
        body: {
          shopping_mall_ai_backend_products_id: product.id,
          bundle_name: RandomGenerator.name(2),
          sku_code: skuCode,
          price: 9990,
          inventory_policy: "track",
          is_active: true,
        } satisfies IShoppingMallAiBackendProductBundle.ICreate,
      },
    );
  typia.assert(firstBundle);

  // 4. Attempt to create another bundle with the same SKU code, expecting error on duplication
  await TestValidator.error(
    "duplicate SKU bundle creation should fail",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.products.bundles.create(
        connection,
        {
          productId: product.id,
          body: {
            shopping_mall_ai_backend_products_id: product.id,
            bundle_name: RandomGenerator.name(2),
            sku_code: skuCode,
            price: 8888,
            inventory_policy: "track",
            is_active: true,
          } satisfies IShoppingMallAiBackendProductBundle.ICreate,
        },
      );
    },
  );
}
