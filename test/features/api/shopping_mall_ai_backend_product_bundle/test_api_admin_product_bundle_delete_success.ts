import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProduct";
import type { IShoppingMallAiBackendProductBundle } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductBundle";

export async function test_api_admin_product_bundle_delete_success(
  connection: api.IConnection,
) {
  /**
   * E2E test for soft-deleting a product bundle (SKU/variant) as an admin.
   *
   * This test follows the full business flow:
   *
   * 1. Register a new admin account and authenticate.
   * 2. Create a new product as the admin.
   * 3. Create a new bundle/SKU variant for that product.
   * 4. Soft-delete the bundle by calling the DELETE endpoint.
   * 5. Confirm via field checks that soft-deletion succeeded (audit/compliance
   *    retention). (Note: If a bundle GET/list endpoint were available, it
   *    would be called here to ensure `deleted_at` is set and the bundle is no
   *    longer listed in normal queries. Currently, this is documented as a
   *    limitation.)
   */

  // 1. Register a new admin account and authenticate to acquire access token
  const adminJoinInput: IShoppingMallAiBackendAdmin.ICreate = {
    username: RandomGenerator.alphabets(8),
    password_hash: RandomGenerator.alphaNumeric(16),
    name: RandomGenerator.name(),
    email: `${RandomGenerator.alphabets(7)}@company.com`,
    phone_number: RandomGenerator.mobile(),
    is_active: true,
  };
  const adminAuthorized = await api.functional.auth.admin.join(connection, {
    body: adminJoinInput,
  });
  typia.assert(adminAuthorized);
  TestValidator.predicate(
    "admin account creation succeeded and is active",
    adminAuthorized.admin.is_active,
  );

  // 2. Create a new product as an admin user
  const productInput: IShoppingMallAiBackendProduct.ICreate = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    slug: RandomGenerator.alphaNumeric(12),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 4,
      sentenceMax: 10,
    }),
    product_type: "physical",
    business_status: "active",
    min_order_quantity: 1,
    max_order_quantity: 100,
    tax_code: RandomGenerator.alphaNumeric(4),
    sort_priority: 0,
  };
  const product =
    await api.functional.shoppingMallAiBackend.admin.products.create(
      connection,
      {
        body: productInput,
      },
    );
  typia.assert(product);
  TestValidator.equals(
    "product slug matches input",
    product.slug,
    productInput.slug,
  );
  TestValidator.predicate(
    "product is not deleted immediately after creation",
    !product.deleted_at,
  );

  // 3. Create a bundle/SKU variant for the newly created product
  const bundleInput: IShoppingMallAiBackendProductBundle.ICreate = {
    shopping_mall_ai_backend_products_id: product.id,
    bundle_name: RandomGenerator.paragraph({ sentences: 2 }),
    sku_code: RandomGenerator.alphaNumeric(10),
    price: 15000,
    inventory_policy: "track",
    is_active: true,
  };
  const bundle =
    await api.functional.shoppingMallAiBackend.admin.products.bundles.create(
      connection,
      {
        productId: product.id,
        body: bundleInput,
      },
    );
  typia.assert(bundle);
  TestValidator.equals(
    "bundle's product id matches parent product",
    bundle.shopping_mall_ai_backend_products_id,
    product.id,
  );
  TestValidator.predicate("bundle is active after creation", bundle.is_active);
  TestValidator.equals(
    "bundle is not deleted after creation",
    bundle.deleted_at,
    null,
  );

  // 4. Soft delete the bundle (SKU variant)
  await api.functional.shoppingMallAiBackend.admin.products.bundles.erase(
    connection,
    {
      productId: product.id,
      bundleId: bundle.id,
    },
  );

  // 5. (Auditability/compliance check)
  // Note: Because the API does not provide a bundle GET or list endpoint, we cannot programmatically fetch
  // and confirm that deleted_at is set or the bundle is filtered from normal queries. If such an endpoint
  // existed, we would call it here, verify the bundle's deleted_at is now a date-time, and that the bundle
  // is not returned in standard bundle listings. This step is left as a comment due to the test API surface.
}
