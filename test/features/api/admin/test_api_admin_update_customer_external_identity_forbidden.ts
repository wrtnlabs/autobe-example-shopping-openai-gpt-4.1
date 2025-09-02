import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendCustomerExternalIdentity } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomerExternalIdentity";

export async function test_api_admin_update_customer_external_identity_forbidden(
  connection: api.IConnection,
) {
  /**
   * Attempt to update an external identity for a customer as an admin, where
   * either the customer or identity does not exist, or the admin has no access
   * rights. Confirm proper forbidden/not-found error is thrown and no update
   * occurs.
   *
   * Steps:
   *
   * 1. Create an admin via /auth/admin/join, ensuring Authorization header is set
   *    for the connection.
   * 2. Attempt to update a customer external identity using random UUIDs for
   *    customerId and externalIdentityId (so neither likely exists).
   * 3. Validate that API responds with HTTP 403 Forbidden or 404 Not Found via
   *    TestValidator.error().
   */
  const adminJoinResult = await api.functional.auth.admin.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(8),
      password_hash: RandomGenerator.alphaNumeric(32),
      name: RandomGenerator.name(),
      email: `${RandomGenerator.alphaNumeric(8)}@admin-e2e.com`,
      is_active: true,
      phone_number: null,
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });
  typia.assert(adminJoinResult);

  await TestValidator.error(
    "admin forbidden to update non-existent customer external identity",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.customers.externalIdentities.update(
        connection,
        {
          customerId: typia.random<string & tags.Format<"uuid">>(),
          externalIdentityId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            provider: RandomGenerator.pick([
              "google",
              "apple",
              "naver",
              "kakao",
            ] as const),
            provider_key: RandomGenerator.alphaNumeric(16),
            last_verified_at: null,
          } satisfies IShoppingMallAiBackendCustomerExternalIdentity.IUpdate,
        },
      );
    },
  );
}
