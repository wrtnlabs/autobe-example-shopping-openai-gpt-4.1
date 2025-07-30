import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";

/**
 * Test deletion of a non-existent or already deleted SKU.
 *
 * This test ensures that attempting to delete a SKU using a skuId that does not
 * exist in the product catalog (either because it never existed or has already
 * been deleted) results in a not-found error and that no deletion operation is
 * performed. This is critical for validating robust error handling and to
 * ensure clean API behavior when users attempt to remove absent records.
 *
 * Steps:
 *
 * 1. Generate a random SKU UUID that is extremely unlikely to exist in the system.
 * 2. Attempt to delete the SKU using the DELETE endpoint.
 * 3. Expect a not-found error (404) to be thrown and ensure no action is
 *    performed.
 */
export async function test_api_aimall_backend_administrator_skus_test_delete_sku_not_found(
  connection: api.IConnection,
) {
  // 1. Generate a random SKU UUID (ensuring it's extremely unlikely to exist)
  const nonexistentSkuId = typia.random<string & tags.Format<"uuid">>();

  // 2. Attempt to delete the SKU and expect a not-found error
  await TestValidator.error(
    "delete non-existent SKU must return not found error",
  )(async () => {
    await api.functional.aimall_backend.administrator.skus.erase(connection, {
      skuId: nonexistentSkuId,
    });
  });
}
