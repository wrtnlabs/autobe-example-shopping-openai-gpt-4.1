import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSku";

/**
 * Validate handling of SKU update request on a non-existent SKU by an
 * administrator.
 *
 * This test ensures that when an administrator attempts to update a SKU using
 * an invalid or already-deleted skuId, the system responds with a not-found
 * error and does not perform any update operation.
 *
 * Process:
 *
 * 1. Construct a random UUID that is extremely unlikely to exist as a SKU id in
 *    the system.
 * 2. Prepare a valid update DTO for the SKU mutation (e.g., with a new random
 *    sku_code).
 * 3. Call the SKU update API with the invalid skuId and expect a not-found error
 *    response.
 * 4. Assert that the system throws an error and does not perform any resource
 *    change.
 * 5. (Omitted) Verifying absence of the SKU post-operation is not possible as no
 *    list/fetch API is provided.
 */
export async function test_api_aimall_backend_administrator_skus_test_update_sku_not_found(
  connection: api.IConnection,
) {
  // 1. Generate a random UUID for the SKU id which is not present in the system.
  const nonExistentSkuId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 2. Create a valid update request body with a random SKU code.
  const updateBody: IAimallBackendSku.IUpdate = {
    sku_code: `TEST-NON-EXIST-${RandomGenerator.alphaNumeric(8)}`,
  };

  // 3 & 4. Attempt the update; must throw a not-found error (HTTP 404 or equivalent).
  await TestValidator.error("should fail when updating a non-existent SKU")(
    () =>
      api.functional.aimall_backend.administrator.skus.update(connection, {
        skuId: nonExistentSkuId,
        body: updateBody,
      }),
  );

  // 5. No further verification possible (no API to check SKU existence post-operation)
}
