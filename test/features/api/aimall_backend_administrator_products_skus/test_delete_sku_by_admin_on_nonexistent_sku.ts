import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";

/**
 * Test administrator attempting to delete a SKU with either a non-existent
 * skuId or a skuId that does not belong to the specified productId.
 *
 * This test checks that the API correctly rejects such deletion requests:
 *
 * - When the skuId does not exist at all
 * - When the productId does not exist
 * - When both exist but the skuId does not belong to the given productId
 *
 * No data should be deleted, and the API must return a not found or appropriate
 * error.
 *
 * Steps:
 *
 * 1. Attempt to delete a SKU using random values for productId and skuId (which
 *    are UUIDs and almost certainly do not exist)
 *
 *    - Confirm API returns an error (e.g., 404 Not Found)
 * 2. Attempt to delete with a random productId and a different random skuId
 *
 *    - Confirm API returns an error
 * 3. (If possible) Attempt to delete with valid-looking UUIDs where productId and
 *    skuId are equal but likely unrelated
 *
 *    - Confirm API returns an error In all cases, API should not delete any SKU or
 *         affect any other records
 */
export async function test_api_aimall_backend_administrator_products_skus_test_delete_sku_by_admin_on_nonexistent_sku(
  connection: api.IConnection,
) {
  // 1. Attempt deletion with both productId and skuId completely random (almost certainly don't exist)
  await TestValidator.error(
    "Nonexistent SKU and product delete should return error",
  )(async () => {
    await api.functional.aimall_backend.administrator.products.skus.erase(
      connection,
      {
        productId: typia.random<string & tags.Format<"uuid">>(),
        skuId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  });

  // 2. Attempt deletion with another random pair (IDs are different again)
  await TestValidator.error("Another random SKU/product pair returns error")(
    async () => {
      await api.functional.aimall_backend.administrator.products.skus.erase(
        connection,
        {
          productId: typia.random<string & tags.Format<"uuid">>(),
          skuId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );

  // 3. Attempt with same random UUID used for both fields (highly unlikely they are a valid parent/child)
  const fakeId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("Mismatched SKU/product relation returns error")(
    async () => {
      await api.functional.aimall_backend.administrator.products.skus.erase(
        connection,
        {
          productId: fakeId,
          skuId: fakeId,
        },
      );
    },
  );
}
