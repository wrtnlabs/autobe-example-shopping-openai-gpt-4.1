import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSku";

/**
 * Validates error handling when retrieving a SKU by a non-existent or deleted
 * skuId.
 *
 * This test ensures that the API correctly returns a not-found error (e.g.,
 * HTTP 404) when attempting to fetch a SKU using a uuid that does not
 * correspond to any existing SKU record. This behavior is essential to
 * guarantee proper propagation of error conditions to the frontend or
 * management interfaces when referencing unknown SKUs.
 *
 * Steps:
 *
 * 1. Generate a random, likely non-existent uuid value to use as skuId.
 * 2. Call the GET /aimall-backend/administrator/skus/{skuId} endpoint with this
 *    uuid.
 * 3. Validate that the response is a not-found error (runtime error thrown).
 * 4. Do NOT validate error message content or error type class; only check that an
 *    error occurs.
 *
 * Edge case: There is a small theoretical possibility that the generated uuid
 * corresponds to a real SKU in the database (for example, in dev/test
 * environments with random data collisions). In this unlikely event, the test
 * will pass but not validate the error-handling logic. Typically, this is
 * acceptable given sufficiently random UUID usage in test populations.
 */
export async function test_api_aimall_backend_administrator_skus_test_get_sku_by_id_not_found(
  connection: api.IConnection,
) {
  // 1. Generate a random UUID string for skuId (likely not present)
  const nonExistentSkuId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 2. Attempt to retrieve non-existent SKU and validate error handling
  await TestValidator.error("should error for non-existent skuId")(async () => {
    await api.functional.aimall_backend.administrator.skus.at(connection, {
      skuId: nonExistentSkuId,
    });
  });
}
