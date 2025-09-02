import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";

export async function test_api_customer_update_profile_success(
  connection: api.IConnection,
) {
  /**
   * E2E test for updating a customer profile as admin (PUT
   * /shoppingMallAiBackend/admin/customers/{customerId})
   *
   * Steps:
   *
   * 1. Create and authenticate an admin using api.functional.auth.admin.join.
   * 2. Generate a customerId for testing (simulate an existing customer).
   * 3. Prepare valid customer update payload (editing allowed fields: name,
   *    nickname, is_active, is_verified).
   * 4. Call api.functional.shoppingMallAiBackend.admin.customers.update with
   *    generated customerId and payload.
   * 5. Validate the response matches the requested values on editable fields.
   * 6. Attempt to update a restricted field (e.g., 'password') and confirm error
   *    handling.
   */
  // 1. Create and authenticate an admin
  const adminUsername = RandomGenerator.alphaNumeric(10);
  const adminName = RandomGenerator.name();
  const adminEmail = `${RandomGenerator.alphabets(6)}@testdomain.com`;
  const adminPasswordHash = RandomGenerator.alphaNumeric(32);

  const adminJoinRes = await api.functional.auth.admin.join(connection, {
    body: {
      username: adminUsername,
      password_hash: adminPasswordHash,
      name: adminName,
      email: adminEmail,
      is_active: true,
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });
  typia.assert(adminJoinRes);

  // 2. Generate a customerId (pretend this is an existing customer)
  const customerId = typia.random<string & tags.Format<"uuid">>();

  // 3. Prepare allowed customer update payload
  const updatePayload = {
    name: RandomGenerator.name(),
    nickname: RandomGenerator.name(1),
    is_active: false,
    is_verified: true,
  } satisfies IShoppingMallAiBackendCustomer.IUpdate;

  // 4. Update the customer profile as admin
  const updatedCustomer =
    await api.functional.shoppingMallAiBackend.admin.customers.update(
      connection,
      {
        customerId,
        body: updatePayload,
      },
    );
  typia.assert(updatedCustomer);

  // 5. Validate that all changes are reflected correctly
  TestValidator.equals(
    "updated name matches",
    updatedCustomer.name,
    updatePayload.name,
  );
  TestValidator.equals(
    "updated nickname matches",
    updatedCustomer.nickname,
    updatePayload.nickname,
  );
  TestValidator.equals(
    "updated is_active matches",
    updatedCustomer.is_active,
    updatePayload.is_active,
  );
  TestValidator.equals(
    "updated is_verified matches",
    updatedCustomer.is_verified,
    updatePayload.is_verified,
  );

  // 6. Try updating a restricted field (should fail)
  await TestValidator.error(
    "should fail to update restricted field: password",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.customers.update(
        connection,
        {
          customerId,
          body: {
            password: RandomGenerator.alphaNumeric(16),
            name: RandomGenerator.name(),
          } as any,
        },
      );
    },
  );
}
