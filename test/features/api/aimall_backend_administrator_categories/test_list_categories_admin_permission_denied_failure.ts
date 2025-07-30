import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPageIAimallBackendCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendCategory";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAimallBackendCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCategory";

/**
 * Validate that unauthorized users cannot access the admin category listing.
 *
 * Business context: Only authenticated administrators can access the
 * /aimall-backend/administrator/categories endpoint. Attempts by users with an
 * expired admin token or insufficient privileges must be rejected by the API,
 * returning an appropriate authorization error (401/403) and no data.
 *
 * Step-by-step process:
 *
 * 1. Use a connection object representing an unauthorized user (e.g., no token,
 *    invalid token, or insufficient privileges).
 * 2. Attempt to call categories.index() to fetch the administrator category list.
 * 3. Assert that an authorization error occurs (such as 401 Unauthorized or 403
 *    Forbidden), confirming that such access is denied per security policy.
 *
 * This is critical for security: ensures that private endpoints are not exposed
 * to users without admin authorization.
 */
export async function test_api_aimall_backend_administrator_categories_test_list_categories_admin_permission_denied_failure(
  connection: api.IConnection,
) {
  // 1. Use an unauthorized connection: no/invalid token or insufficient admin rights. (Setup handled by test runner.)

  // 2. Access the endpoint and assert authorization failure.
  await TestValidator.error(
    "unauthorized users cannot access admin category list",
  )(async () => {
    await api.functional.aimall_backend.administrator.categories.index(
      connection,
    );
  });
}
