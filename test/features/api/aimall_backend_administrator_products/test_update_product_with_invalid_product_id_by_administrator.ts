import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";

/**
 * Validate that attempting to update a product with a non-existent (invalid)
 * productId as an administrator returns a not found error and does not result
 * in any data changes.
 *
 * This test ensures that the API correctly handles requests referencing missing
 * resources and does not accidentally create or mutate records. An update is
 * attempted with a random UUID that is not tied to any existing product, and
 * the test expects an error (such as 404 not found) in response.
 *
 * Steps:
 *
 * 1. Generate a random UUID for `productId` assumed not to exist.
 * 2. Prepare a valid product update payload with some changes.
 * 3. Attempt to update the product via the administrator API endpoint.
 * 4. Confirm that an error is thrown (e.g., 404 not found) and no data is leaked
 *    or mutated.
 */
export async function test_api_aimall_backend_administrator_products_test_update_product_with_invalid_product_id_by_administrator(
  connection: api.IConnection,
) {
  // 1. Generate a random UUID for `productId` (nonexistent)
  const invalidProductId = typia.random<string & tags.Format<"uuid">>();

  // 2. Prepare a valid update payload
  const updateBody: IAimallBackendProduct.IUpdate = {
    title: "Updated product title for invalid productId test",
    description: "This update should fail due to nonexistent product.",
    status: "inactive",
  };

  // 3. Attempt the update and expect an error response
  await TestValidator.error(
    "API should return not found for invalid productId",
  )(async () => {
    await api.functional.aimall_backend.administrator.products.update(
      connection,
      {
        productId: invalidProductId,
        body: updateBody,
      },
    );
  });
}
