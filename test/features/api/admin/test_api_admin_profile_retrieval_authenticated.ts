import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

/**
 * Test that an admin user can register, authenticate, and retrieve their own or
 * another admin's detailed profile, while enforcing strict access control,
 * sensitive data hiding, and audit/metadata field delivery.
 *
 * 1. Register a new admin account with unique credentials, capturing the
 *    system-assigned id and received authorization/token envelope.
 * 2. Assert the authorization token and admin DTO are valid and contain no
 *    sensitive fields.
 * 3. Use the admin id and token to request GET
 *    /shoppingMall/admin/admins/{adminId}.
 * 4. Assert full profile data is returned: id, email, full_name, status,
 *    two_factor_secret, created_at, updated_at, last_login_at, deleted_at (per
 *    schema). Assert password or hash is never present.
 * 5. Security/audit info: status correctness, 2FA presence/absence, last login
 *    value (may be null/undefined).
 * 6. Request with a clearly invalid UUID in path; assert error.
 * 7. Request with a valid but nonexistent UUID; assert error.
 * 8. Attempt with unauthenticated connection; assert authentication required.
 */
export async function test_api_admin_profile_retrieval_authenticated(
  connection: api.IConnection,
) {
  // 1. Register a new admin
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphabets(10) + "!@#A1";
  const full_name = RandomGenerator.name();
  const body = {
    email,
    password,
    full_name,
  } satisfies IShoppingMallAdmin.ICreate;
  const authorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body });
  typia.assert(authorized);
  TestValidator.equals(
    "registered admin email matches input",
    authorized.email,
    email,
  );
  TestValidator.equals(
    "registered admin full_name matches input",
    authorized.full_name,
    full_name,
  );
  TestValidator.equals("account status", authorized.status, "pending");

  // 2. Retrieve profile by id (authenticated)
  const result: IShoppingMallAdmin =
    await api.functional.shoppingMall.admin.admins.at(connection, {
      adminId: authorized.id,
    });
  typia.assert(result);
  TestValidator.equals("admin id matches", result.id, authorized.id);
  TestValidator.equals("admin email matches", result.email, authorized.email);
  TestValidator.equals(
    "admin full_name matches",
    result.full_name,
    authorized.full_name,
  );
  TestValidator.equals(
    "admin status matches",
    result.status,
    authorized.status,
  );
  TestValidator.equals(
    "admin created_at matches",
    result.created_at,
    authorized.created_at,
  );
  TestValidator.equals(
    "admin updated_at matches",
    result.updated_at,
    authorized.updated_at,
  );
  TestValidator.equals(
    "admin deleted_at matches",
    result.deleted_at,
    authorized.deleted_at,
  );

  // Security fields: password must NOT exist
  TestValidator.predicate(
    "password and password_hash fields are NOT present",
    typeof (result as any).password === "undefined" &&
      typeof (result as any).password_hash === "undefined",
  );
  // Audit/security attribute presence
  TestValidator.predicate(
    "2FA field present (may be null/undefined)",
    "two_factor_secret" in result,
  );
  TestValidator.predicate(
    "last_login_at field present (may be null/undefined)",
    "last_login_at" in result,
  );

  // 3. Try invalid UUID
  await TestValidator.error("invalid UUID in path yields error", async () => {
    await api.functional.shoppingMall.admin.admins.at(connection, {
      adminId: "not-a-uuid" as any,
    });
  });
  // 4. Try valid, non-existent UUID
  const unusedAdminId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("non-existent adminId yields error", async () => {
    await api.functional.shoppingMall.admin.admins.at(connection, {
      adminId: unusedAdminId,
    });
  });

  // 5. Try unauthenticated: should reject
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthenticated request is denied", async () => {
    await api.functional.shoppingMall.admin.admins.at(unauthConn, {
      adminId: authorized.id,
    });
  });
}
