import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendSeller";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProduct";
import type { IShoppingMallAiBackendProductBundle } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductBundle";

/**
 * Test that deleting a product bundle twice (already soft-deleted resource)
 * is handled gracefully by the API (idempotently or by clear error).
 *
 * Scenario context: This scenario validates that when a seller attempts to
 * delete a product bundle (SKU variant) that has already been soft deleted
 * (deleted_at set), the API responds in an idempotent, consistent, and
 * robust way—throwing a clear error or reporting no effect—rather than
 * causing a system crash or leaving the system in an inconsistent state.
 * This edge test ensures safe handling of repeated destructive operations
 * (double delete), which is a common REST API design contract (either
 * idempotency or explicit error).
 *
 * Steps:
 *
 * 1. Register and authenticate a new seller (via /auth/seller/join)
 * 2. Create a new product under the authenticated seller
 * 3. Create a bundle (SKU variant) for the product
 * 4. Delete (soft-delete) the bundle
 * 5. Attempt to delete the same bundle again (double delete)
 * 6. Assert that the second delete call yields a proper error (via
 *    TestValidator.error)
 */
export async function test_api_product_bundle_delete_already_deleted_failure(
  connection: api.IConnection,
) {
  // 1. Seller registration/authentication
  const sellerAuth = await api.functional.auth.seller.join(connection, {
    body: {
      email: `${RandomGenerator.alphabets(8)}@testmail.com`,
      business_registration_number: RandomGenerator.alphaNumeric(12),
      name: RandomGenerator.name(),
    } satisfies IShoppingMallAiBackendSeller.ICreate,
  });
  typia.assert(sellerAuth);

  // 2. Create a product as this seller
  const product =
    await api.functional.shoppingMallAiBackend.seller.products.create(
      connection,
      {
        body: {
          title: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 5,
            wordMax: 10,
          }),
          slug: RandomGenerator.alphaNumeric(12),
          description: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 8,
            sentenceMax: 15,
            wordMin: 4,
            wordMax: 8,
          }),
          product_type: RandomGenerator.alphabets(6),
          business_status: RandomGenerator.pick([
            "active",
            "draft",
            "paused",
          ] as const),
          min_order_quantity: typia.random<number>(),
          max_order_quantity: typia.random<number>(),
          tax_code: RandomGenerator.alphaNumeric(6),
          sort_priority: typia.random<number>(),
        } satisfies IShoppingMallAiBackendProduct.ICreate,
      },
    );
  typia.assert(product);

  // 3. Create a product bundle (SKU variant) for that product
  const bundle =
    await api.functional.shoppingMallAiBackend.seller.products.bundles.create(
      connection,
      {
        productId: product.id,
        body: {
          shopping_mall_ai_backend_products_id: product.id,
          bundle_name: RandomGenerator.name(2),
          sku_code: RandomGenerator.alphaNumeric(16),
          price: typia.random<number>(),
          inventory_policy: RandomGenerator.pick([
            "track",
            "ignore",
            "inherit",
          ] as const),
          is_active: true,
        } satisfies IShoppingMallAiBackendProductBundle.ICreate,
      },
    );
  typia.assert(bundle);

  // 4. Initial deletion of the bundle (soft-delete)
  await api.functional.shoppingMallAiBackend.seller.products.bundles.erase(
    connection,
    {
      productId: product.id,
      bundleId: bundle.id,
    },
  );

  // 5. Attempt to delete the same bundle again (should fail or be idempotent-error)
  await TestValidator.error(
    "Deleting an already-soft-deleted product bundle should yield an error",
    async () => {
      await api.functional.shoppingMallAiBackend.seller.products.bundles.erase(
        connection,
        {
          productId: product.id,
          bundleId: bundle.id,
        },
      );
    },
  );
}
