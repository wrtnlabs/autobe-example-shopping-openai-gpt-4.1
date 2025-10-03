import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

/**
 * Test registration of new admin with minimum required fields.
 *
 * 1. Generate a random valid business email, password, and name.
 * 2. Call /auth/admin/join with these fields.
 * 3. On success, assert the returned object matches
 *    IShoppingMallAdmin.IAuthorized, with id, correct email/name, status,
 *    kyc_status, token, etc.
 * 4. Verify sensitive values (plaintext password) are not present in the response.
 * 5. Attempt registration with the same email again (should fail), expecting an
 *    error response.
 */
export async function test_api_admin_registration_minimum_fields(
  connection: api.IConnection,
) {
  // 1. Generate random business email, strong password, and name
  const email: string = typia.random<string & tags.Format<"email">>();
  const password: string = RandomGenerator.alphaNumeric(16);
  const name: string = RandomGenerator.name();

  // 2. Call /auth/admin/join – success path
  const admin = await api.functional.auth.admin.join(connection, {
    body: { email, password, name } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(admin);

  // 3. Verify response matches IAuthorized with correct fields
  TestValidator.equals("admin email matches input", admin.email, email);
  TestValidator.equals("admin name matches input", admin.name, name);
  TestValidator.predicate(
    "admin id is valid uuid",
    typeof admin.id === "string" && admin.id.length > 0,
  );
  TestValidator.predicate(
    "status exists",
    typeof admin.status === "string" && admin.status.length > 0,
  );
  TestValidator.predicate(
    "kyc_status exists",
    typeof admin.kyc_status === "string" && admin.kyc_status.length > 0,
  );
  TestValidator.predicate(
    "created_at is ISO date",
    typeof admin.created_at === "string",
  );
  TestValidator.predicate(
    "token is present",
    typeof admin.token === "object" && typeof admin.token.access === "string",
  );
  TestValidator.predicate(
    "no plaintext password in response",
    !("password" in admin),
  );

  // 4. Attempt duplicate registration (same email) – error expected
  await TestValidator.error("duplicate email join should fail", async () => {
    await api.functional.auth.admin.join(connection, {
      body: {
        email,
        password: RandomGenerator.alphaNumeric(16),
        name: RandomGenerator.name(),
      } satisfies IShoppingMallAdmin.IJoin,
    });
  });
}
