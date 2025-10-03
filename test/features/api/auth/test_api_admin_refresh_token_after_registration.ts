import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

/**
 * Validate successful JWT refresh workflow for a recently registered admin.
 *
 * 1. Register a new admin via /auth/admin/join using random but valid input
 * 2. Validate the join response (admin information, tokens, default status fields)
 * 3. Use the issued refresh token to request new tokens via /auth/admin/refresh
 * 4. Validate the refresh response returns a new authorized admin/tokens and that
 *    audit fields are updated
 */
export async function test_api_admin_refresh_token_after_registration(
  connection: api.IConnection,
) {
  // 1. Register new admin
  const adminJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
  } satisfies IShoppingMallAdmin.IJoin;

  const joined: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinInput,
    });
  typia.assert(joined);

  // 2. Sanity checks on join response
  TestValidator.equals(
    "admin email matches input",
    joined.email,
    adminJoinInput.email,
  );
  TestValidator.equals(
    "admin name matches input",
    joined.name,
    adminJoinInput.name,
  );
  TestValidator.equals("admin status is active", joined.status, "active");
  TestValidator.notEquals(
    "deleted_at is null or undefined",
    joined.deleted_at,
    undefined,
  );
  TestValidator.predicate(
    "KYC status is pending or verified",
    joined.kyc_status === "verified" || joined.kyc_status === "pending",
  );
  typia.assert(joined.token);

  // 3. Refresh the tokens using the issued refresh token
  const refreshInput = {
    refreshToken: joined.token.refresh,
  } satisfies IShoppingMallAdmin.IRefresh;
  const refreshed: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.refresh(connection, {
      body: refreshInput,
    });
  typia.assert(refreshed);

  // 4. Checks on refreshed tokens and admin info
  TestValidator.equals(
    "admin ID unchanged after refresh",
    refreshed.id,
    joined.id,
  );
  TestValidator.equals(
    "admin email unchanged after refresh",
    refreshed.email,
    joined.email,
  );
  TestValidator.notEquals(
    "access token is changed after refresh",
    refreshed.token.access,
    joined.token.access,
  );
  TestValidator.notEquals(
    "refresh token is changed after refresh",
    refreshed.token.refresh,
    joined.token.refresh,
  );
  TestValidator.notEquals(
    "updated_at differs after refresh (audit trail)",
    refreshed.updated_at,
    joined.updated_at,
  );
  TestValidator.equals(
    "admin status still active after refresh",
    refreshed.status,
    "active",
  );
}
