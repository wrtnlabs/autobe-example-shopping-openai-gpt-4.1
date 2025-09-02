import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function test_api_admin_token_refresh_expired_or_invalid_token_failure(
  connection: api.IConnection,
) {
  /**
   * Test admin token refresh rejection for invalid scenarios.
   *
   * Verifies that /auth/admin/refresh correctly denies token issuance when:
   *
   * - An already-used refresh token (after first use) is presented
   * - A clearly invalid string (not a refresh token) is presented
   * - A structurally plausible random UUID (but unused or expired) is presented
   *
   * 1. Register a new admin account (join) to obtain valid tokens
   * 2. Use the valid refresh token ONCE to get new tokens
   * 3. Attempt to use the same refresh token again — expect failure
   * 4. Attempt with a random string — expect failure
   * 5. Attempt with a random UUID — expect failure
   *
   * All error scenarios should result in proper error rejection and no new
   * tokens issued.
   */

  // 1. Register admin and get tokens
  const passwordHash = RandomGenerator.alphaNumeric(32);
  const adminInput: IShoppingMallAiBackendAdmin.ICreate = {
    username: RandomGenerator.alphaNumeric(10),
    password_hash: passwordHash,
    name: RandomGenerator.name(),
    email: `${RandomGenerator.alphaNumeric(8)}@mallcorp.test`,
    phone_number: null,
    is_active: true,
  };
  const joinResp = await api.functional.auth.admin.join(connection, {
    body: adminInput,
  });
  typia.assert(joinResp);
  const validRefresh = joinResp.token.refresh;

  // 2. Use the valid refresh token once (should succeed)
  const refreshResp = await api.functional.auth.admin.refresh(connection, {
    body: {
      refresh_token: validRefresh,
    } satisfies IShoppingMallAiBackendAdmin.IRefresh,
  });
  typia.assert(refreshResp);

  // 3. Attempt to use the (now used/invalid) refresh token again — must fail
  await TestValidator.error(
    "admin token refresh fails with reused token",
    async () => {
      await api.functional.auth.admin.refresh(connection, {
        body: {
          refresh_token: validRefresh,
        } satisfies IShoppingMallAiBackendAdmin.IRefresh,
      });
    },
  );

  // 4. Attempt with an obviously invalid token string
  await TestValidator.error(
    "admin token refresh fails with clearly invalid token string",
    async () => {
      await api.functional.auth.admin.refresh(connection, {
        body: {
          refresh_token: RandomGenerator.alphabets(15),
        } satisfies IShoppingMallAiBackendAdmin.IRefresh,
      });
    },
  );

  // 5. Attempt with a random UUID (unused/expired token)
  await TestValidator.error(
    "admin token refresh fails with random uuid",
    async () => {
      await api.functional.auth.admin.refresh(connection, {
        body: {
          refresh_token: typia.random<string & tags.Format<"uuid">>(),
        } satisfies IShoppingMallAiBackendAdmin.IRefresh,
      });
    },
  );
}
