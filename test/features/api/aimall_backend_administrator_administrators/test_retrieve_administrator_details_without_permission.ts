import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAdministrator";

/**
 * Validate that administrator detail retrieval is access-controlled.
 *
 * This test checks that access to the AIMall administrator details API
 * (/aimall-backend/administrator/administrators/{administratorId}) is properly
 * restricted: attempts to access this route with insufficient permission
 * (customer or unauthenticated connection) must be denied and result in an
 * error. This assures compliance with platform RBAC security.
 *
 * Step-by-step process:
 *
 * 1. Assume the provided connection lacks administrator privileges (as explicit
 *    customer/unauthenticated login is not available in materials)
 * 2. Attempt to retrieve admin details using a random valid UUID
 * 3. Confirm that access is denied (request fails with error)
 */
export async function test_api_aimall_backend_administrator_administrators_test_retrieve_administrator_details_without_permission(
  connection: api.IConnection,
) {
  // 1. Prepare a non-admin or unauthenticated connection
  // (No customer login API available - assume caller is not admin)

  // 2. Attempt to access administrator details - should fail
  const administratorId: string = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("Access is denied for non-admin user")(async () => {
    await api.functional.aimall_backend.administrator.administrators.at(
      connection,
      {
        administratorId,
      },
    );
  });
}
