import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPageIAimallBackendChannelAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendChannelAssignment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAimallBackendChannelAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendChannelAssignment";

/**
 * Validate that requesting channel assignments for a non-existent product as an
 * administrator results in a 404 error.
 *
 * This test ensures that the administrator-facing API properly rejects requests
 * for channel assignments when the given product does not exist. By supplying a
 * productId in UUID format that is not present in the database, it verifies the
 * API's ability to return a 404 Not Found error as expected, maintaining the
 * integrity of error handling for missing resources.
 *
 * Steps:
 *
 * 1. Generate a random UUID as a productId that is very unlikely to correspond to
 *    a real product.
 * 2. Attempt to retrieve channel assignments for this productId using the admin
 *    endpoint.
 * 3. Confirm that the API throws a 404 error, indicating the product resource does
 *    not exist.
 */
export async function test_api_aimall_backend_administrator_products_channelAssignments_index_test_list_channel_assignments_product_not_found_as_admin(
  connection: api.IConnection,
) {
  // Step 1: Generate a random productId with UUID format that should not exist in the database
  const nonExistentProductId: string = typia.random<
    string & tags.Format<"uuid">
  >();

  // Step 2: Attempt the API request, expecting a 404 error due to the non-existent product
  await TestValidator.error("Should return 404 for non-existent product")(() =>
    api.functional.aimall_backend.administrator.products.channelAssignments.index(
      connection,
      { productId: nonExistentProductId },
    ),
  );
}
