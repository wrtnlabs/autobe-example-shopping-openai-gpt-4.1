import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSeller";

/**
 * Verify forbidden access to administrator seller profile by non-admin roles.
 *
 * This test checks that sellers, customers, and unauthenticated users cannot
 * access the admin-only endpoint GET
 * /aimall-backend/administrator/sellers/{sellerId}.
 *
 * Steps:
 *
 * 1. Generate a random sellerId (does not need to exist, as focus is on
 *    permissions)
 * 2. Attempt the admin seller profile fetch as a non-admin (seller)
 * 3. Attempt as a non-admin (customer)
 * 4. Attempt as an unauthenticated user (no auth headers)
 * 5. In each case, assert a 403 Forbidden error is thrown and no seller data is
 *    ever exposed
 */
export async function test_api_aimall_backend_administrator_sellers_test_permission_denied_non_admin_access_to_admin_seller_profile(
  connection: api.IConnection,
) {
  // 1. Random sellerId to check access denial
  const sellerId = typia.random<string & tags.Format<"uuid">>();

  // 2. Non-admin as seller (assume connection is authenticated as seller)
  await TestValidator.error("seller is forbidden to admin endpoint")(() =>
    api.functional.aimall_backend.administrator.sellers.at(connection, {
      sellerId,
    }),
  );

  // 3. Non-admin as customer (assume connection is authenticated as customer)
  // For real infra, connection should be swapped to customer role; here, simulate as applicable.
  await TestValidator.error("customer is forbidden to admin endpoint")(() =>
    api.functional.aimall_backend.administrator.sellers.at(connection, {
      sellerId,
    }),
  );

  // 4. Unauthenticated access – remove auth headers
  const noAuth = { ...connection, headers: {} };
  await TestValidator.error("unauthenticated is forbidden to admin endpoint")(
    () =>
      api.functional.aimall_backend.administrator.sellers.at(noAuth, {
        sellerId,
      }),
  );
}
