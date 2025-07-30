import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSeller";
import type { IPageIAimallBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendSeller";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validate that non-admin users cannot access the seller search/filter
 * endpoint.
 *
 * This test attempts to access the PATCH /aimall-backend/administrator/sellers
 * endpoint (advanced seller search/filter, admin-only) as a non-admin user. The
 * function ensures that the API returns a permission error, denying access to
 * non-admin identities and that no sensitive seller data is disclosed.
 *
 * Steps:
 *
 * 1. Attempt seller search as an unauthenticated (anonymous) user (no
 *    authentication token)
 *
 * - The request is performed with a minimal filter object and no credentials
 * - Confirm that a permission/authorization error is thrown and no data is
 *   returned
 *
 * 2. Testing for customer/seller users is omitted due to absence of relevant
 *    authentication APIs
 *
 * If/when customer/seller authentication APIs are provided in the project,
 * similar assertions should be implemented for those roles.
 */
export async function test_api_aimall_backend_administrator_sellers_test_permission_denied_for_non_admin_on_search_sellers(
  connection: api.IConnection,
) {
  // 1. Unauthenticated (anonymous) user
  await TestValidator.error("unauthenticated user cannot access seller search")(
    async () => {
      await api.functional.aimall_backend.administrator.sellers.search(
        connection,
        {
          body: {}, // minimal filter, anonymous access
        },
      );
    },
  );

  // 2 & 3. Customer/seller login and permission checks omitted:
  // No authentication APIs for customer or seller provided in current project scope.
}
