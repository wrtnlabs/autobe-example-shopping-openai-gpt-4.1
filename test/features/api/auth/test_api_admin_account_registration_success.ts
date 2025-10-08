import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

/**
 * Test successful registration of a new admin account ("happy path").
 *
 * This function verifies the /auth/admin/join endpoint by registering an admin:
 *
 * 1. Generates unique and valid admin registration data.
 * 2. Makes registration call with explicit 'pending' status.
 * 3. Asserts response shape: id is uuid, email and full_name match,
 *    status=='pending'.
 * 4. Confirms token property exists and matches the IAuthorizationToken shape.
 * 5. Ensures no sensitive fields (password_hash, two_factor_secret) are present in
 *    the output.
 */
export async function test_api_admin_account_registration_success(
  connection: api.IConnection,
) {
  // 1. Prepare unique email and registration input
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16); // strong password
  const full_name = RandomGenerator.name(2);

  const createBody = {
    email,
    password,
    full_name,
    status: "pending",
  } satisfies IShoppingMallAdmin.ICreate;

  // 2. Register new admin via /auth/admin/join
  const result = await api.functional.auth.admin.join(connection, {
    body: createBody,
  });
  typia.assert(result);

  // 3. Field-level assertions
  TestValidator.predicate(
    "admin id is a valid uuid",
    typeof result.id === "string" && /^[0-9a-f-]{36}$/i.test(result.id),
  );
  TestValidator.equals("registered email matches", result.email, email);
  TestValidator.equals(
    "registered full_name matches",
    result.full_name,
    full_name,
  );
  TestValidator.equals("admin status is pending", result.status, "pending");
  TestValidator.predicate(
    "token of type IAuthorizationToken exists",
    !!result.token &&
      typeof result.token.access === "string" &&
      typeof result.token.refresh === "string",
  );
  TestValidator.predicate(
    "password_hash and two_factor_secret are not present in output",
    !("password_hash" in result) && !("two_factor_secret" in result),
  );

  // 4. (If observable) check email verification trigger or audit log (skipped: not present in response)
}
