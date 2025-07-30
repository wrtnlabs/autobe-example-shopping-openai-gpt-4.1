import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAdministrator";

/**
 * Validate retrieval of platform administrator summary and enforce admin-only
 * access.
 *
 * Business scenario:
 *
 * - Only authenticated admins may access administrator summaries via API.
 * - The endpoint returns a summary object (active, suspended) omitting sensitive
 *   fields.
 * - Non-admin access triggers an authorization error.
 *
 * Steps:
 *
 * 1. Ensure a test administrator exists (create one if needed).
 * 2. Retrieve administrator summary as authenticated admin:
 *
 *    - Validate result is ISummary type.
 *    - Confirm summary has no password/token fields.
 * 3. Attempt access as non-admin (missing admin authorization):
 *
 *    - Confirm access is forbidden (throws error).
 */
export async function test_api_aimall_backend_administrator_administrators_index(
  connection: api.IConnection,
) {
  // 1. Ensure a test administrator exists
  const permission_id: string = typia.random<string & tags.Format<"uuid">>();
  const admin =
    await api.functional.aimall_backend.administrator.administrators.create(
      connection,
      {
        body: {
          permission_id,
          email: `${typia.random<string>()}@e2e-admin.com`,
          name: "E2E Test Admin",
          status: "active",
        } satisfies IAimallBackendAdministrator.ICreate,
      },
    );
  typia.assert(admin);

  // 2. Retrieve administrator summary as authenticated admin
  const summary =
    await api.functional.aimall_backend.administrator.administrators.index(
      connection,
    );
  typia.assert<IAimallBackendAdministrator.ISummary>(summary);
  TestValidator.equals("summary has no password field")("password" in summary)(
    false,
  );
  TestValidator.equals("summary has no token field")("token" in summary)(false);

  // 3. Attempt access as non-admin (simulate no admin credentials)
  const nonAdminConnection = {
    ...connection,
    headers: { ...connection.headers },
  };
  delete nonAdminConnection.headers["Authorization"];
  await TestValidator.error("non-admin cannot access admin summary")(
    async () => {
      await api.functional.aimall_backend.administrator.administrators.index(
        nonAdminConnection,
      );
    },
  );
}
