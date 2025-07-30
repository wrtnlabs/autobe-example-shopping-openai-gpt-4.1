import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCategory";
import type { IPageIAimallBackendCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendCategory";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Verify that PATCH
 * /aimall-backend/seller/categories/{categoryId}/childCategories is restricted
 * by user role.
 *
 * This endpoint should only be accessible to sellers and administrators.
 * Attempt to invoke this endpoint as a user who does NOT have seller or admin
 * privileges (e.g., a regular customer, or an unauthorized/inactive account).
 * The expectation is that the API rejects the request, returning a 401
 * Unauthorized or 403 Forbidden error.
 *
 * Steps:
 *
 * 1. Simulate or authenticate as a role that is neither seller nor administrator
 *    (e.g., a regular customer, or an unauthorized/inactive account).
 * 2. Attempt to PATCH for child categories using the endpoint PATCH
 *    /aimall-backend/seller/categories/{categoryId}/childCategories with sample
 *    or random data.
 * 3. Confirm that the API call fails due to insufficient permissions and that an
 *    appropriate error (typically 401 or 403) is thrown.
 * 4. Ensure no data is returned and access is denied as expected.
 */
export async function test_api_aimall_backend_test_patch_child_categories_seller_role_only(
  connection: api.IConnection,
) {
  // Step 1: Ensure the connection does not have seller/admin privileges. (Assume it is a customer or unauthenticated.)

  // Step 2: Attempt PATCH operation on the endpoint as a non-seller/non-admin.
  await TestValidator.error("Non-seller should be forbidden or unauthorized")(
    async () => {
      await api.functional.aimall_backend.seller.categories.childCategories.search(
        connection,
        {
          categoryId: typia.random<string & tags.Format<"uuid">>(),
          body: typia.random<IAimallBackendCategory.IRequest>(),
        },
      );
    },
  );
  // Step 3: No further validation required; test passes if error is thrown, fails otherwise.
}
