import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendCoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCoin";

export async function test_api_admin_coin_wallet_update_not_found(
  connection: api.IConnection,
) {
  /**
   * Validate error handling when updating a coin wallet with a missing (not
   * found) coinId as admin.
   *
   * Business context:
   *
   * - Admins can update coin wallet ledgers only for existing coins.
   * - API must enforce entity existence and return a not found error for
   *   non-existent coinId, even to authenticated admins.
   *
   * Steps:
   *
   * 1. Register and authenticate a new admin (join) to establish context.
   * 2. Attempt to update a coin wallet using a generated, non-existent UUID as
   *    coinId and a valid field in the update body.
   * 3. Assert that the API returns an error (not found), confirming proper
   *    business rule and error handling implementation.
   */
  // 1. Register and authenticate as admin
  const adminJoinBody = {
    username: RandomGenerator.alphaNumeric(10),
    password_hash: RandomGenerator.alphaNumeric(32),
    name: RandomGenerator.name(),
    email: typia.random<string & tags.Format<"email">>(),
    phone_number: RandomGenerator.mobile(),
    is_active: true,
  } satisfies IShoppingMallAiBackendAdmin.ICreate;
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert(adminAuth);

  // 2. Attempt to update a coin wallet using a non-existent coinId
  await TestValidator.error(
    "update coin wallet with nonexistent coinId should result in not found error",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.coins.update(
        connection,
        {
          coinId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            usable_coin: 1000,
          } satisfies IShoppingMallAiBackendCoin.IUpdate,
        },
      );
    },
  );
}
