import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function test_api_admin_delete_customer_external_identity_success(
  connection: api.IConnection,
) {
  /**
   * Test successful deletion of a customer's external identity by an admin.
   *
   * Validates that an administrator can remove a customer's external identity
   * (e.g., social login mapping) for compliance, privacy, or account management
   * scenarios. This operation can be performed regardless of the customer's
   * login state.
   *
   * Workflow:
   *
   * 1. Register an admin account and authenticate (required authorization
   *    context).
   * 2. Generate random (mock) UUIDs for the target customer and the target
   *    external identity, because customer/external identity creation endpoints
   *    are not present in the dependency/API set.
   * 3. As the admin, invoke the erase endpoint to delete the external identity for
   *    the customer.
   * 4. Assert the API call succeeds (does not throw), confirming successful
   *    deletion logic for the authorized admin.
   */
  // 1. Register and authenticate as an admin
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(8),
      password_hash: RandomGenerator.alphaNumeric(32),
      name: RandomGenerator.name(),
      email: typia.random<string & tags.Format<"email">>(),
      phone_number: null,
      is_active: true,
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });
  typia.assert(adminAuth);

  // 2. Generate random UUIDs for customer and external identity (in lieu of API-driven creation)
  const customerId = typia.random<string & tags.Format<"uuid">>();
  const externalIdentityId = typia.random<string & tags.Format<"uuid">>();

  // 3. Delete the external identity as admin (should succeed)
  await api.functional.shoppingMallAiBackend.admin.customers.externalIdentities.erase(
    connection,
    {
      customerId,
      externalIdentityId,
    },
  );

  // 4. No direct API to verify deletion, so test ensures no error is thrown and completes successfully
}
