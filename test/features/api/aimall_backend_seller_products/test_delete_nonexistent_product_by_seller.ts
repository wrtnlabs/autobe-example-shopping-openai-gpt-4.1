import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSeller";

/**
 * Validate error handling when a seller attempts to delete a non-existent or
 * already-deleted product.
 *
 * This test ensures:
 *
 * - A valid seller account exists
 * - When the seller attempts to delete a product by a random non-existent
 *   productId, the API returns a not found error (typically 404)
 * - No unintended side effects occur for other data (cannot be verified in detail
 *   as list/query endpoints are not available)
 *
 * Steps:
 *
 * 1. Create a valid seller (simulate onboarding, as deletion context)
 * 2. Generate a random UUID, not associated with any actual product
 * 3. Attempt the DELETE operation as the seller for the random productId
 * 4. Assert that the operation fails with the expected error (404 Not Found or
 *    similar)
 */
export async function test_api_aimall_backend_seller_products_test_delete_nonexistent_product_by_seller(
  connection: api.IConnection,
) {
  // 1. Create a valid seller via admin onboarding
  const sellerInput = {
    business_name: RandomGenerator.alphabets(12),
    email: RandomGenerator.alphabets(8) + "@autotest.com",
    contact_phone:
      "010" +
      typia
        .random<string & tags.Format<"uuid">>()
        .replace(/-/g, "")
        .slice(0, 8),
    status: "approved",
  } satisfies IAimallBackendSeller.ICreate;
  const seller =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      { body: sellerInput },
    );
  typia.assert(seller);

  // 2. Generate a random productId (uuid) that does not exist
  const nonExistentProductId = typia.random<string & tags.Format<"uuid">>();

  // 3. Attempt to delete the non-existent product as the seller
  await TestValidator.error(
    "should fail to delete when product does not exist",
  )(
    async () =>
      await api.functional.aimall_backend.seller.products.erase(connection, {
        productId: nonExistentProductId,
      }),
  );
}
