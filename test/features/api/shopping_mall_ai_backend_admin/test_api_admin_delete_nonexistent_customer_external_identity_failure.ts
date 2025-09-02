import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function test_api_admin_delete_nonexistent_customer_external_identity_failure(
  connection: api.IConnection,
) {
  /**
   * Validates error handling when an admin attempts to delete a customer
   * external identity with non-existent or unrelated identifiers.
   *
   * Steps:
   *
   * 1. Register and authenticate as a new admin (using random admin credentials).
   * 2. Attempt to delete a customer external identity using random UUIDs for both
   *    customerId and externalIdentityId, targeting a non-existent mapping.
   * 3. Assert that the deletion attempt fails, verifying the backend returns a
   *    proper error response (e.g., not found or forbidden), confirming correct
   *    security and validation controls.
   */
  // 1. Register and authenticate as a new admin
  const adminAuthorized = await api.functional.auth.admin.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      password_hash: RandomGenerator.alphaNumeric(32),
      name: RandomGenerator.name(),
      email: `${RandomGenerator.alphaNumeric(8)}@admin.com` as string &
        tags.Format<"email">,
      is_active: true,
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });
  typia.assert(adminAuthorized);

  // 2. Attempt deletion of a non-existent mapping
  await TestValidator.error(
    "admin cannot delete mapping for nonexistent customer or external identity",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.customers.externalIdentities.erase(
        connection,
        {
          customerId: typia.random<string & tags.Format<"uuid">>(),
          externalIdentityId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
