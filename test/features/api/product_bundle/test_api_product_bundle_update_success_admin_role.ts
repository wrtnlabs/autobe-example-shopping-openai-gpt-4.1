import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProduct";
import type { IShoppingMallAiBackendProductBundle } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductBundle";

export async function test_api_product_bundle_update_success_admin_role(
  connection: api.IConnection,
) {
  /**
   * Test successful update of a product bundle by an admin
   *
   * This verifies that an admin can update bundle attributes—name, SKU, price,
   * inventory policy, and activation status—for a product bundle. All
   * relationships and audit fields are checked, and type correctness is
   * ensured.
   *
   * Steps:
   *
   * 1. Register and authenticate as admin
   * 2. Create a product
   * 3. Create a bundle for the product
   * 4. Update the bundle with new values
   * 5. Confirm all changes and relationships are correct
   */

  // 1. Register and authenticate as admin (get access token)
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(8),
      password_hash: RandomGenerator.alphaNumeric(32),
      name: RandomGenerator.name(),
      email: `${RandomGenerator.alphaNumeric(6)}@test.com`,
      is_active: true,
      phone_number: RandomGenerator.mobile(),
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });
  typia.assert(adminAuth);
  TestValidator.predicate(
    "admin registration returns token",
    !!adminAuth.token?.access,
  );

  // 2. Create a product as admin
  const product =
    await api.functional.shoppingMallAiBackend.admin.products.create(
      connection,
      {
        body: {
          title: RandomGenerator.name(2),
          slug: RandomGenerator.alphaNumeric(10),
          description: RandomGenerator.content({ paragraphs: 2 }),
          product_type: "physical",
          business_status: "active",
          min_order_quantity: 1,
          max_order_quantity: 10,
          tax_code: RandomGenerator.alphaNumeric(5),
          sort_priority: 1,
        } satisfies IShoppingMallAiBackendProduct.ICreate,
      },
    );
  typia.assert(product);

  // 3. Create a bundle for that product
  const bundle =
    await api.functional.shoppingMallAiBackend.admin.products.bundles.create(
      connection,
      {
        productId: product.id,
        body: {
          shopping_mall_ai_backend_products_id: product.id,
          bundle_name: RandomGenerator.paragraph({ sentences: 2 }),
          sku_code: RandomGenerator.alphaNumeric(12),
          price: 9900,
          inventory_policy: "track",
          is_active: true,
        } satisfies IShoppingMallAiBackendProductBundle.ICreate,
      },
    );
  typia.assert(bundle);
  TestValidator.equals(
    "created bundle is linked to product",
    bundle.shopping_mall_ai_backend_products_id,
    product.id,
  );

  // 4. Update the bundle with new attributes
  const updatedData = {
    bundle_name: RandomGenerator.paragraph({ sentences: 2 }),
    sku_code: RandomGenerator.alphaNumeric(14),
    price: 15800,
    inventory_policy: "ignore",
    is_active: false,
  } satisfies IShoppingMallAiBackendProductBundle.IUpdate;
  const updatedBundle =
    await api.functional.shoppingMallAiBackend.admin.products.bundles.update(
      connection,
      {
        productId: product.id,
        bundleId: bundle.id,
        body: updatedData,
      },
    );
  typia.assert(updatedBundle);

  // 5. Validate all mutable attributes and relationships
  TestValidator.equals(
    "updated bundle name matches",
    updatedBundle.bundle_name,
    updatedData.bundle_name,
  );
  TestValidator.equals(
    "updated bundle SKU matches",
    updatedBundle.sku_code,
    updatedData.sku_code,
  );
  TestValidator.equals(
    "updated bundle price matches",
    updatedBundle.price,
    updatedData.price,
  );
  TestValidator.equals(
    "updated inventory policy matches",
    updatedBundle.inventory_policy,
    updatedData.inventory_policy,
  );
  TestValidator.equals(
    "updated bundle activation status matches",
    updatedBundle.is_active,
    updatedData.is_active,
  );
  TestValidator.equals(
    "bundle remains linked to product after update",
    updatedBundle.shopping_mall_ai_backend_products_id,
    product.id,
  );
  TestValidator.predicate(
    "bundle updated_at timestamp reflects update",
    new Date(updatedBundle.updated_at).getTime() >=
      new Date(bundle.updated_at).getTime(),
  );
}
