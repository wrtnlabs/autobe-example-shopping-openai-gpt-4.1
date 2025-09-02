import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendProductTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductTag";
import type { IPageIShoppingMallAiBackendProductTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendProductTag";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validate that the admin product tag search endpoint cannot be accessed
 * without admin authentication.
 *
 * Business context: Admin product tag management endpoints are restricted
 * to authorized admin accounts. This test ensures that permission
 * boundaries are enforced at the backend by denying unauthenticated users
 * any access, even for safe-read search operations. Such checks are
 * critical for maintaining data security and platform integrity, preventing
 * privilege escalation or information leakage via unsecured queries.
 *
 * Test Steps:
 *
 * 1. Without performing any admin authentication (or after explicitly creating
 *    a clean, unauthenticated connection), attempt to invoke the PATCH
 *    /shoppingMallAiBackend/admin/productTags endpoint, passing any valid
 *    or empty filter (e.g., default pagination).
 * 2. Confirm that the API call fails, raising an authorization error (401/403
 *    or a business-specific error), and does not return search result
 *    data.
 * 3. (Optional) Check that no sensitive data is exposed or returned despite
 *    the failure.
 *
 * The test passes if unauthorized access is strictly denied, and no admin
 * product tag resources are returned for unauthenticated users.
 */
export async function test_api_admin_product_tag_search_permission_denied_for_unauthorized(
  connection: api.IConnection,
) {
  // 1. Create a fresh, unauthenticated connection (no Authorization header)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  // 2. Attempt to perform a PATCH request to the product tag search endpoint as unauthenticated user
  await TestValidator.error(
    "product tag search as unauthenticated user is denied",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.productTags.index(
        unauthConn,
        {
          body: {}, // minimal input to check permission
        },
      );
    },
  );
}
