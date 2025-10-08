import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

/**
 * Test admin JWT refresh with an active session.
 *
 * This scenario performs complete admin authentication flow:
 *
 * 1. Register a new shopping mall admin
 * 2. Log in as the admin to obtain access and refresh tokens
 * 3. Use the refresh API to acquire a new token set with the valid refresh token
 * 4. Validate that new tokens differ from the previous ones, and the admin context
 *    remains the same
 * 5. Attempt refresh with an invalid/expired/revoked token (simulate business
 *    error scenario)
 */
export async function test_api_admin_token_refresh_existing_session(
  connection: api.IConnection,
) {
  // 1. Register a new admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminFullName = RandomGenerator.name();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const joinAdmin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      full_name: adminFullName,
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(joinAdmin);
  TestValidator.equals("admin email should match", joinAdmin.email, adminEmail);

  // 2. Login as admin to obtain tokens
  const loginAdmin = await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IShoppingMallAdmin.ILogin,
  });
  typia.assert(loginAdmin);
  TestValidator.equals("login email matches", loginAdmin.email, adminEmail);
  TestValidator.equals(
    "admin full_name matches",
    loginAdmin.full_name,
    adminFullName,
  );

  // 3. Perform refresh with valid refresh token
  const refreshInput = {
    refresh_token: loginAdmin.token.refresh,
  } satisfies IShoppingMallAdmin.IRefresh;
  const refreshed = await api.functional.auth.admin.refresh(connection, {
    body: refreshInput,
  });
  typia.assert(refreshed);

  // 4. Validate the new token and session info
  TestValidator.notEquals(
    "refresh access token should differ from original",
    refreshed.token.access,
    loginAdmin.token.access,
  );
  TestValidator.notEquals(
    "refresh refresh token should differ from previous",
    refreshed.token.refresh,
    loginAdmin.token.refresh,
  );
  TestValidator.equals(
    "refreshed admin id matches login id",
    refreshed.id,
    loginAdmin.id,
  );
  TestValidator.equals(
    "refreshed email matches login",
    refreshed.email,
    loginAdmin.email,
  );

  // 5. Simulate error: reuse old refresh token again should fail (single-use refresh, if policy enforced)
  await TestValidator.error(
    "refreshing twice with same refresh token should fail",
    async () => {
      await api.functional.auth.admin.refresh(connection, {
        body: refreshInput,
      });
    },
  );
}
