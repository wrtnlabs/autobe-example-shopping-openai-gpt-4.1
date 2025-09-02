import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendCustomerExternalIdentity } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomerExternalIdentity";

export async function test_api_admin_update_customer_external_identity_success(
  connection: api.IConnection,
) {
  /**
   * E2E test: Admin successfully updates a customer's external identity record.
   *
   * Business purpose: Verifies that a properly authenticated admin can update
   * properties on an existing customer's external identity mapping. The test is
   * structured to use only available endpoints: admin registration (for
   * context), and the external identity update endpoint (for update).
   *
   * Test steps:
   *
   * 1. Register a new admin account and use it as the authenticated context for
   *    the update operation.
   * 2. Simulate existing customer and external identity records using valid UUIDs
   *    (since no creation endpoints are available).
   * 3. Choose distinct new values for provider_key and last_verified_at for the
   *    update (fields defined in IUpdate DTO).
   * 4. Perform the update via the admin API and receive the updated external
   *    identity object.
   * 5. Validate that provider_key and last_verified_at were updated, and that
   *    customer_id/externalIdentityId correspondence is correct in the
   *    response.
   */
  // 1. Admin registration and context establishment
  const adminRegistration = await api.functional.auth.admin.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(12),
      password_hash: RandomGenerator.alphaNumeric(32),
      name: RandomGenerator.name(),
      email: `${RandomGenerator.alphaNumeric(8)}@admin-example.com`,
      phone_number: null,
      is_active: true,
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });
  typia.assert(adminRegistration);
  // At this point, the connection carries admin authorization for subsequent API calls.

  // 2. Prepare valid UUIDs for simulation (since we're not creating entities in this test)
  const customerId = typia.random<string & tags.Format<"uuid">>();
  const externalIdentityId = typia.random<string & tags.Format<"uuid">>();

  // 3. Prepare property updates
  const newProviderKey = RandomGenerator.alphaNumeric(18);
  const newLastVerifiedAt = new Date().toISOString();

  // 4. Perform the update as admin
  const updated =
    await api.functional.shoppingMallAiBackend.admin.customers.externalIdentities.update(
      connection,
      {
        customerId,
        externalIdentityId,
        body: {
          provider_key: newProviderKey,
          last_verified_at: newLastVerifiedAt,
        } satisfies IShoppingMallAiBackendCustomerExternalIdentity.IUpdate,
      },
    );
  typia.assert(updated);

  // 5. Validate updated fields and record integrity
  TestValidator.equals(
    "provider_key updated",
    updated.provider_key,
    newProviderKey,
  );
  TestValidator.equals(
    "last_verified_at updated",
    updated.last_verified_at,
    newLastVerifiedAt,
  );
  TestValidator.equals(
    "customer id is correct",
    updated.customer_id,
    customerId,
  );
  TestValidator.equals(
    "external identity id is correct",
    updated.id,
    externalIdentityId,
  );
}
