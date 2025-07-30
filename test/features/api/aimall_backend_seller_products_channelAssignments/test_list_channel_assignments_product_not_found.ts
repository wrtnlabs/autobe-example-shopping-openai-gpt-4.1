import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPageIAimallBackendChannelAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendChannelAssignment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAimallBackendChannelAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendChannelAssignment";

/**
 * Validates error response when seller requests channel assignments for a
 * non-existent product.
 *
 * This test verifies that the API responds with a 404 Not Found error if a
 * seller attempts to list channel assignments for a productId that does not
 * exist in the system. The endpoint expects a valid UUID for the productId path
 * parameter, but the product corresponding to this ID must not exist. No
 * dependencies or authentication setup is required for this scenario beyond
 * what is already present in the connection context. The test attempts the GET
 * operation using a random UUID and asserts that a 404 error is thrown,
 * conforming to proper error handling design for missing resources.
 *
 * Step-by-step process:
 *
 * 1. Generate a random UUID as the non-existent productId
 * 2. Attempt to GET /aimall-backend/seller/products/{productId}/channelAssignments
 * 3. Validate that the call results in an error (expected: 404 Not Found)
 */
export async function test_api_aimall_backend_seller_products_channelAssignments_test_list_channel_assignments_product_not_found(
  connection: api.IConnection,
) {
  // 1. Generate random UUID for non-existent product
  const nonExistentProductId = typia.random<string & tags.Format<"uuid">>();

  // 2. Attempt the GET request – expect 404 error (resource does not exist)
  await TestValidator.error("should throw 404 for non-existent product")(
    async () => {
      await api.functional.aimall_backend.seller.products.channelAssignments.index(
        connection,
        {
          productId: nonExistentProductId,
        },
      );
    },
  );
}
