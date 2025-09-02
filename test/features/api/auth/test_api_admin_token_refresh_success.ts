import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Validates successful admin token refresh flow.
 *
 * This test ensures the security-critical admin token renewal mechanism
 * operates correctly:
 *
 * 1. Register a new admin via /auth/admin/join with unique data.
 * 2. Confirm the response contains a valid admin info and issued
 *    access/refresh tokens.
 * 3. Immediately call /auth/admin/refresh with the issued refresh token.
 * 4. Validate that new tokens are returned and differ from the originals.
 * 5. Ensure admin identity and status remain consistent/active after refresh.
 * 6. Confirm that no extra fields are leaked in the refresh API response.
 * 7. Check all types conform to the provided DTOs.
 */
export async function test_api_admin_token_refresh_success(
  connection: api.IConnection,
) {
  // 1. Register a new admin (pre-requisite for refresh)
  const uniqueUsername = RandomGenerator.alphaNumeric(10);
  const passwordHash = RandomGenerator.alphaNumeric(32);
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const joinResp: IShoppingMallAiBackendAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        username: uniqueUsername,
        password_hash: passwordHash,
        name: RandomGenerator.name(),
        email: adminEmail,
        is_active: true,
        phone_number: null,
      } satisfies IShoppingMallAiBackendAdmin.ICreate,
    });
  typia.assert(joinResp);

  // 2. Confirm join response correctness
  TestValidator.predicate(
    "admin is active immediately after join",
    joinResp.admin.is_active,
  );
  TestValidator.equals(
    "admin username after join matches input",
    joinResp.admin.username,
    uniqueUsername,
  );
  TestValidator.equals(
    "admin email after join matches input",
    joinResp.admin.email,
    adminEmail,
  );
  TestValidator.predicate(
    "join returns all required token fields",
    !!joinResp.token.access &&
      !!joinResp.token.refresh &&
      !!joinResp.token.expired_at &&
      !!joinResp.token.refreshable_until,
  );

  // 3. Call refresh with returned refresh token
  const refreshResp: IShoppingMallAiBackendAdmin.IAuthorized =
    await api.functional.auth.admin.refresh(connection, {
      body: { refresh_token: joinResp.token.refresh },
    });
  typia.assert(refreshResp);

  // 4. Confirm tokens have changed on refresh
  TestValidator.notEquals(
    "access token updated on refresh",
    refreshResp.token.access,
    joinResp.token.access,
  );
  TestValidator.notEquals(
    "refresh token updated on refresh",
    refreshResp.token.refresh,
    joinResp.token.refresh,
  );

  // 5. Ensure admin account identity and active status are unchanged
  TestValidator.equals(
    "admin id persisted on refresh",
    refreshResp.admin.id,
    joinResp.admin.id,
  );
  TestValidator.equals(
    "admin username unchanged on refresh",
    refreshResp.admin.username,
    uniqueUsername,
  );
  TestValidator.equals(
    "admin is still active after refresh",
    refreshResp.admin.is_active,
    true,
  );

  // 6. Refresh response contains only allowed top-level keys
  TestValidator.equals(
    "refresh response strictly contains only 'admin' and 'token' keys",
    Object.keys(refreshResp).sort(),
    ["admin", "token"].sort(),
  );

  // 7. Token payload fields must all be present and strings
  TestValidator.predicate(
    "refresh token DTO fields all present and type string",
    typeof refreshResp.token.access === "string" &&
      typeof refreshResp.token.refresh === "string" &&
      typeof refreshResp.token.expired_at === "string" &&
      typeof refreshResp.token.refreshable_until === "string",
  );

  // 8. No extra admin properties (e.g., password_hash) are leaked in admin profile
  TestValidator.predicate(
    "admin profile contains only allowed keys",
    Object.keys(refreshResp.admin).every((k) =>
      [
        "id",
        "username",
        "name",
        "email",
        "phone_number",
        "is_active",
        "last_login_at",
        "created_at",
        "updated_at",
        "deleted_at",
      ].includes(k),
    ),
  );
}
