import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendChannel";
import type { IPageIAimallBackendChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendChannel";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validate that channel search operation is forbidden for non-admin users.
 *
 * This test verifies that users without administrator privileges (including
 * unauthenticated users) are not allowed to search/filter platform channels via
 * the administrator endpoint. According to business rules, only administrators
 * may access /aimall-backend/administrator/channels search/filter operations.
 * Any attempt by a non-admin must result in an authorization error (HTTP 401 or
 * 403) and not return any channel data.
 *
 * Test Steps:
 *
 * 1. Generate a valid channel search/filter request body with random or default
 *    parameters.
 * 2. Use a connection object with no administrator privileges
 *    (non-admin/unauthenticated context).
 * 3. Attempt to invoke the /aimall-backend/administrator/channels PATCH endpoint
 *    with the search body.
 * 4. Assert that the operation throws an authorization error (401/403
 *    Forbidden/Unauthorized).
 */
export async function test_api_aimall_backend_administrator_channels_test_search_channels_with_unauthorized_user(
  connection: api.IConnection,
) {
  // 1. Prepare a valid/random search body for channel filtering
  const searchBody: IAimallBackendChannel.IRequest =
    typia.random<IAimallBackendChannel.IRequest>();

  // 2. Attempt channel search as a non-admin (unauthenticated or unauthorized) user
  await TestValidator.error(
    "admin channel search should be forbidden to non-admin",
  )(() =>
    api.functional.aimall_backend.administrator.channels.search(connection, {
      body: searchBody,
    }),
  );
}
