import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendDeposit } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendDeposit";

export async function test_api_deposit_detail_not_found(
  connection: api.IConnection,
) {
  /**
   * Validate error handling when requesting a non-existent deposit ledger by
   * its unique ID as admin.
   *
   * This test verifies that the API correctly returns an error (404 or similar)
   * when an authenticated admin attempts to retrieve the details of a deposit
   * ledger that does not exist. The steps are as follows:
   *
   * 1. Admin registration & authentication: Register a new admin using
   *    /auth/admin/join, ensuring admin context for the request.
   * 2. Attempted GET: Generate a random UUID guaranteed not to exist (since just
   *    registered, no deposit ledgers should exist with this ID), and attempt
   *    to retrieve deposit details with GET
   *    /shoppingMallAiBackend/admin/deposits/{depositId}.
   * 3. Error Validation: Validate that the API throws a Not Found error (e.g.,
   *    404), confirming that the system enforces correct error response for
   *    missing resources.
   */

  // 1. Admin registration and authentication
  const adminJoinInput: IShoppingMallAiBackendAdmin.ICreate = {
    username: RandomGenerator.alphaNumeric(10),
    password_hash: RandomGenerator.alphaNumeric(60), // using 60 chars to resemble bcrypt-style hashes
    name: RandomGenerator.name(),
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    is_active: true,
    phone_number: null,
  };
  const authorizedAdmin: IShoppingMallAiBackendAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinInput,
    });
  typia.assert(authorizedAdmin);

  // 2. Attempt to retrieve a non-existent deposit ledger (random UUID)
  const unknownDepositId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Validate API throws Not Found error
  await TestValidator.error(
    "should throw not found error when retrieving non-existent depositId",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.deposits.at(connection, {
        depositId: unknownDepositId,
      });
    },
  );
}
