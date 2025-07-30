import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAdministrator";

/**
 * Test creation API prevents duplicate administrator emails.
 *
 * Ensures that the AIMall backend enforces unique email addresses for
 * administrator accounts at creation time. If a new admin is registered with an
 * email already in use, the API should reject the request due to a unique
 * constraint violation.
 *
 * Steps:
 *
 * 1. Create a baseline administrator using a unique random email.
 * 2. Attempt to create another administrator using the same email but different
 *    name/status/permission_id.
 * 3. Assert that a constraint violation error (duplicate email) occurs on the
 *    second operation.
 *
 * Note: Cannot verify system state beyond API error due to lack of query
 * endpoints for admin listing; the test focuses on correct API error signalling
 * of the email uniqueness rule.
 */
export async function test_api_aimall_backend_administrator_administrators_test_create_administrator_with_duplicate_email(
  connection: api.IConnection,
) {
  // 1. Create the initial administrator with a unique random email
  const initialAdminData = {
    permission_id: typia.random<string & tags.Format<"uuid">>(),
    email: typia.random<string & tags.Format<"email">>(),
    name: "First Test Admin",
    status: "active",
  } satisfies IAimallBackendAdministrator.ICreate;
  const firstAdmin =
    await api.functional.aimall_backend.administrator.administrators.create(
      connection,
      { body: initialAdminData },
    );
  typia.assert(firstAdmin);

  // 2. Attempt to create a second administrator with the same email, but other fields changed
  const duplicateAdminData = {
    permission_id: typia.random<string & tags.Format<"uuid">>(), // can vary
    email: initialAdminData.email, // duplicate on purpose
    name: "Duplicate Test Admin",
    status: "pending",
  } satisfies IAimallBackendAdministrator.ICreate;

  // 3. Expect error due to duplicate email
  await TestValidator.error("Duplicate admin email constraint")(async () => {
    await api.functional.aimall_backend.administrator.administrators.create(
      connection,
      { body: duplicateAdminData },
    );
  });
}
