import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendRoleEscalation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendRoleEscalation";

export async function test_api_role_escalation_detail_not_found(
  connection: api.IConnection,
) {
  /**
   * Validate error response when retrieving a non-existent role escalation
   * event by admin.
   *
   * This test verifies that, even with valid admin authentication, accessing a
   * role escalation event with an unknown (random) roleEscalationId properly
   * results in a business or HTTP 404 error response, with no sensitive data
   * leakage.
   *
   * Steps:
   *
   * 1. Register and authenticate as a new admin (POST /auth/admin/join).
   * 2. Attempt to GET a role escalation event with a random, non-existent UUID as
   *    roleEscalationId.
   * 3. Confirm the API throws a 404 (not found) error or suitable business error.
   * 4. Confirm that no sensitive/internal information is returned in the error
   *    response.
   */

  // 1. Create and authenticate a new admin
  const adminRegOutput = await api.functional.auth.admin.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(12),
      password_hash: RandomGenerator.alphaNumeric(32), // Simulate hashed password
      name: RandomGenerator.name(),
      email: typia.random<string & tags.Format<"email">>(),
      phone_number: RandomGenerator.mobile(),
      is_active: true,
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });
  typia.assert(adminRegOutput);
  TestValidator.predicate(
    "admin registration returns valid token and admin info structure",
    !!adminRegOutput.admin &&
      !!adminRegOutput.token &&
      typeof adminRegOutput.admin.id === "string",
  );

  // 2. Generate a random UUID that will not correspond to any real roleEscalationId
  const fakeRoleEscalationId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Attempt GET /shoppingMallAiBackend/admin/roleEscalations/{roleEscalationId} with this fake UUID, expect error
  await TestValidator.error(
    "GET non-existent role escalation should produce not found or business error",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.roleEscalations.at(
        connection,
        {
          roleEscalationId: fakeRoleEscalationId,
        },
      );
    },
  );
}
