import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendSeller";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProduct";
import type { IShoppingMallAiBackendProductBundle } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductBundle";

export async function test_api_product_bundle_delete_soft_delete_success_seller(
  connection: api.IConnection,
) {
  /**
   * Validates the soft (logical) deletion of a seller's product bundle (SKU
   * variant).
   *
   * This test ensures that when a seller deletes a product bundle:
   *
   * - The bundle's deleted_at field is set (indicating soft deletion).
   * - The bundle no longer appears in active bundle listings (assuming such an
   *   endpoint exists, currently only creation and deletion APIs are
   *   available).
   * - The deleted bundle remains accessible in audit logs (not directly testable
   *   in current API).
   *
   * Steps:
   *
   * 1. Register/Login seller to initialize authentication context.
   * 2. Create a new product by the registered seller.
   * 3. Create a product bundle (SKU variant) under that product.
   * 4. Soft-delete the bundle via the erase API.
   * 5. Optionally verify that the bundle's deleted_at property is set (not
   *    directly possible unless there's a Get API; so here, test focuses on
   *    successful deletion).
   */

  // 1. Seller registration/login
  const sellerInfo = {
    email: typia.random<string & tags.Format<"email">>(),
    business_registration_number: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
  } satisfies IShoppingMallAiBackendSeller.ICreate;
  const sellerAuth = await api.functional.auth.seller.join(connection, {
    body: sellerInfo,
  });
  typia.assert(sellerAuth);

  // 2. Create a product as this seller
  const productInput = {
    title: RandomGenerator.name(2),
    slug: RandomGenerator.alphaNumeric(10),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    product_type: RandomGenerator.pick([
      "physical",
      "digital",
      "subscription",
      "service",
    ] as const),
    business_status: RandomGenerator.pick([
      "active",
      "draft",
      "paused",
    ] as const),
    min_order_quantity: 1,
    max_order_quantity: 10,
    tax_code: RandomGenerator.alphaNumeric(6),
    sort_priority: 100,
  } satisfies IShoppingMallAiBackendProduct.ICreate;
  const product =
    await api.functional.shoppingMallAiBackend.seller.products.create(
      connection,
      { body: productInput },
    );
  typia.assert(product);

  // 3. Create a bundle for this product
  const bundleInput = {
    shopping_mall_ai_backend_products_id: product.id,
    bundle_name: RandomGenerator.name(1),
    sku_code: RandomGenerator.alphaNumeric(8),
    price: 10000,
    inventory_policy: RandomGenerator.pick([
      "track",
      "ignore",
      "inherit",
    ] as const),
    is_active: true,
  } satisfies IShoppingMallAiBackendProductBundle.ICreate;
  const bundle =
    await api.functional.shoppingMallAiBackend.seller.products.bundles.create(
      connection,
      {
        productId: product.id,
        body: bundleInput,
      },
    );
  typia.assert(bundle);

  // 4. Soft delete the bundle
  await api.functional.shoppingMallAiBackend.seller.products.bundles.erase(
    connection,
    {
      productId: product.id,
      bundleId: bundle.id,
    },
  );

  // 5. (No direct GET for bundle, so we cannot re-fetch to check deleted_at; assume successful deletion unless error thrown)
  // If a GET API is added in future, we would fetch and check deleted_at is set.
}
