import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendDeposit } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendDeposit";

/**
 * Validate that attempting to update a non-existent deposit ledger as admin
 * returns the correct error.
 *
 * This test ensures that the admin update API correctly handles the case
 * when the specified depositId does not exist in the system. The scenario
 * authenticates as admin (by registering an admin with random credentials),
 * then attempts a deposit update using a UUID that is nearly certainly not
 * present in the database (using typia.random<string &
 * tags.Format<"uuid">>()). The test sends a well-formed update payload
 * (randomized but valid according to IShoppingMallAiBackendDeposit.IUpdate
 * schema) to ensure the failure is due only to the missing deposit, not a
 * validation error.
 *
 * The main assertion is that the operation fails with a Not Found error
 * (typically HTTP 404), and that no deposit record is created or mutated as
 * side effect of the failed update. This guards against both silent
 * creation vulnerability and improper "success" for non-existent records.
 *
 * Test steps:
 *
 * 1. Register a new admin account (POST /auth/admin/join) to obtain
 *    authorization context.
 * 2. With admin credentials, call PUT
 *    /shoppingMallAiBackend/admin/deposits/{depositId} using a random UUID
 *    and valid update payload.
 * 3. Assert that a Not Found (404) error is thrown.
 */
export async function test_api_deposit_update_not_found(
  connection: api.IConnection,
) {
  // 1. Register admin (establish authorized context)
  const username = `admin_${RandomGenerator.alphaNumeric(10)}`;
  const email = `${RandomGenerator.alphabets(8)}+${RandomGenerator.alphaNumeric(4)}@example.com`;
  const password_hash = RandomGenerator.alphaNumeric(36);
  const adminJoinResponse = await api.functional.auth.admin.join(connection, {
    body: {
      username,
      password_hash,
      name: RandomGenerator.name(),
      email,
      phone_number: RandomGenerator.mobile(),
      is_active: true,
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });
  typia.assert(adminJoinResponse);
  typia.assert(adminJoinResponse.admin);
  TestValidator.predicate(
    "admin should be active after registration",
    adminJoinResponse.admin.is_active === true,
  );

  // 2. Attempt to update a deposit with a random (non-existent) depositId
  const randomDepositId = typia.random<string & tags.Format<"uuid">>();
  const updateBody = typia.random<IShoppingMallAiBackendDeposit.IUpdate>();
  await TestValidator.error(
    "should throw 404 Not Found when updating non-existent deposit",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.deposits.update(
        connection,
        {
          depositId: randomDepositId,
          body: updateBody,
        },
      );
    },
  );
}
