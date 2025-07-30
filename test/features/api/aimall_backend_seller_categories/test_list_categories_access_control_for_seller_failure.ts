import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPageIAimallBackendCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendCategory";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAimallBackendCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCategory";

/**
 * Test access control for category listing: suspended or permission-limited
 * seller's access.
 *
 * This test ensures that a seller account that is suspended or whose
 * permissions are limited is properly restricted from accessing the
 * /aimall-backend/seller/categories endpoint. It checks that API access is
 * denied for restricted seller roles, as required by access control business
 * rules.
 *
 * Notes:
 *
 * - Because there are no DTO fields describing category-level access
 *   restrictions, and the test system does not expose APIs to change seller
 *   account status, this test assumes that the passed-in 'connection'
 *   represents a session with a suspended, banned, or permission-limited
 *   seller.
 * - If category metadata supporting positive access filtering (e.g.,
 *   is_restricted) is later added, further negative assertions can be
 *   implemented.
 * - The current assertion only confirms access is denied at the endpoint (error
 *   occurs), consistent with available API contract and data.
 *
 * Steps:
 *
 * 1. Use a connection simulating a suspended or permission-limited seller account
 * 2. Attempt to access /aimall-backend/seller/categories via the seller endpoint
 * 3. Confirm that an error is thrown (forbidden/unauthorized/status error)
 */
export async function test_api_aimall_backend_seller_categories_test_list_categories_access_control_for_seller_failure(
  connection: api.IConnection,
) {
  // 1. Attempt to fetch categories as a suspended/permission-limited seller
  //    (Connection object should embody restricted / forbidden seller session)
  await TestValidator.error("restricted seller cannot access categories")(
    async () => {
      await api.functional.aimall_backend.seller.categories.index(connection);
    },
  );
}
