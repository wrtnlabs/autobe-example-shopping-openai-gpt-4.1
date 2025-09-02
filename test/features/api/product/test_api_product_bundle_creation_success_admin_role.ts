import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProduct";
import type { IShoppingMallAiBackendProductBundle } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductBundle";

/**
 * E2E test: Admin creates a product bundle (SKU variant) for a product
 *
 * This test validates the workflow where an admin:
 *
 * 1. Registers as admin (admin join & auth context)
 * 2. Registers a new product (to have a valid productId)
 * 3. Creates a bundle/SKU variant for that product with unique option set,
 *    unique SKU code, price, inventory policy, activation flag
 * 4. Verifies the returned bundle contains correct data (linked to correct
 *    productId, has all required properties, respects business
 *    constraints)
 * 5. Validates SKU code uniqueness—attempt to create a bundle with the same
 *    SKU code should fail (if API allows duplicate insertion test)
 *
 * The test checks:
 *
 * - All business fields are valid and accepted
 * - SKU uniqueness is enforced
 */
export async function test_api_product_bundle_creation_success_admin_role(
  connection: api.IConnection,
) {
  // 1. Create admin account and authenticate
  const adminJoinInput = {
    username: RandomGenerator.alphabets(8),
    password_hash: RandomGenerator.alphaNumeric(32),
    name: RandomGenerator.name(),
    email: `${RandomGenerator.alphabets(6)}@business.com`,
    phone_number: RandomGenerator.mobile(),
    is_active: true,
  } satisfies IShoppingMallAiBackendAdmin.ICreate;

  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: adminJoinInput,
  });
  typia.assert(adminAuth);

  // 2. Create a new product as admin
  const productInput = {
    title: RandomGenerator.name(2),
    slug: RandomGenerator.alphaNumeric(16),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    product_type: "physical",
    business_status: "active",
    min_order_quantity: 1,
    max_order_quantity: 10,
    tax_code: "VAT10",
    sort_priority: 10,
  } satisfies IShoppingMallAiBackendProduct.ICreate;

  const product =
    await api.functional.shoppingMallAiBackend.admin.products.create(
      connection,
      { body: productInput },
    );
  typia.assert(product);

  // 3. Create a product bundle (SKU variant) for the product
  const bundleSkuCode = RandomGenerator.alphaNumeric(14);
  const bundleInput = {
    shopping_mall_ai_backend_products_id: product.id,
    bundle_name: RandomGenerator.name(2),
    sku_code: bundleSkuCode,
    price: 25000,
    inventory_policy: "track",
    is_active: true,
  } satisfies IShoppingMallAiBackendProductBundle.ICreate;

  const bundle =
    await api.functional.shoppingMallAiBackend.admin.products.bundles.create(
      connection,
      {
        productId: product.id,
        body: bundleInput,
      },
    );
  typia.assert(bundle);

  // 4. Validate fields of the returned bundle
  TestValidator.equals(
    "bundle's parent productId is correct",
    bundle.shopping_mall_ai_backend_products_id,
    product.id,
  );
  TestValidator.equals(
    "bundle name matches input",
    bundle.bundle_name,
    bundleInput.bundle_name,
  );
  TestValidator.equals(
    "bundle SKU code matches input",
    bundle.sku_code,
    bundleInput.sku_code,
  );
  TestValidator.equals(
    "bundle price matches input",
    bundle.price,
    bundleInput.price,
  );
  TestValidator.equals(
    "bundle inventory policy matches input",
    bundle.inventory_policy,
    bundleInput.inventory_policy,
  );
  TestValidator.equals(
    "bundle is_active matches input",
    bundle.is_active,
    bundleInput.is_active,
  );

  // 5. Validate SKU code uniqueness error (should fail if duplicate)
  await TestValidator.error(
    "should fail: SKU code must be unique across bundles",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.products.bundles.create(
        connection,
        {
          productId: product.id,
          body: {
            ...bundleInput,
            bundle_name: RandomGenerator.name(2),
            // sku_code reused deliberately for uniqueness error
          },
        },
      );
    },
  );
}
