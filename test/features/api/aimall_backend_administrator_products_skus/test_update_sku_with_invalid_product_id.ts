import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSku";

/**
 * Validate error handling when trying to update a SKU using an invalid
 * (malformed/non-existent) productId.
 *
 * This function ensures the API properly prevents SKU updates if the parent
 * product does not exist and returns a 404 (not found) or 422 (validation)
 * error. This guards against broken references and data corruption at the
 * catalog level.
 *
 * Steps:
 *
 * 1. Generate a random UUID that does NOT correspond to a real product (invalid
 *    productId).
 * 2. Generate a random UUID for skuId (does not matter if real, since parent
 *    product is invalid).
 * 3. Attempt to update the SKU using the invalid productId.
 * 4. Validate that a HttpError with status 404 (Not Found) or 422 (Unprocessable
 *    Entity) is thrown.
 * 5. Ensure the API does not allow SKU updates tied to non-existent products.
 */
export async function test_api_aimall_backend_administrator_products_skus_test_update_sku_with_invalid_product_id(
  connection: api.IConnection,
) {
  // Step 1: Generate random, non-existent productId and skuId
  const invalidProductId = typia.random<string & tags.Format<"uuid">>();
  const invalidSkuId = typia.random<string & tags.Format<"uuid">>();
  // Step 2: Construct update body (valid or random - since error is on productId)
  const updateBody = typia.random<IAimallBackendSku.IUpdate>();

  // Step 3: Attempt update and verify proper error response
  await TestValidator.error("SKU update with invalid productId should fail")(
    async () => {
      await api.functional.aimall_backend.administrator.products.skus.update(
        connection,
        {
          productId: invalidProductId,
          skuId: invalidSkuId,
          body: updateBody,
        },
      );
    },
  );
}
