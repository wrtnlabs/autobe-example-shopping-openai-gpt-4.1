import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function test_api_admin_registration_success(
  connection: api.IConnection,
) {
  /**
   * E2E test: successful admin registration and token issuance.
   *
   * This test verifies that a new admin can register with all required/valid
   * fields, and receives a complete IAuthorized response with both a profile
   * and a valid authorization token pair (capturing all required audit and
   * identity details). Steps:
   *
   * 1. Generate unique username and email.
   * 2. Generate a random password hash (simulate actual hashed content).
   * 3. Supply a real name and set is_active=true (per success scenario).
   * 4. Make the registration call using api.functional.auth.admin.join().
   * 5. Assert the response includes an admin profile matching input and valid
   *    IAuthorizationToken.
   * 6. Validate returned uuid, email, and date-time fields meet the expected
   *    formats.
   */

  // Step 1: Generate unique username and email
  const username = RandomGenerator.alphaNumeric(10);
  const email = typia.random<string & tags.Format<"email">>();

  // Step 2: Simulate password hash string (64-char hex)
  const hashChars = "abcdef0123456789";
  const password_hash = ArrayUtil.repeat(64, () =>
    RandomGenerator.pick(hashChars.split("")),
  ).join("");

  // Step 3: Random real name, set is_active, no phone for minimum test
  const name = RandomGenerator.name();
  const is_active = true;

  // Step 4: Call registration endpoint
  const output: IShoppingMallAiBackendAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        username,
        password_hash,
        name,
        email,
        is_active,
        // phone_number intentionally omitted for minimal-path test (optional)
      } satisfies IShoppingMallAiBackendAdmin.ICreate,
    });
  typia.assert(output);

  // Step 5: Assert admin response profile
  const admin = output.admin;
  TestValidator.equals("matches input username", admin.username, username);
  TestValidator.equals("matches input name", admin.name, name);
  TestValidator.equals("matches input email", admin.email, email);
  TestValidator.equals("is_active true", admin.is_active, true);
  TestValidator.predicate(
    "admin id is valid uuid",
    typeof admin.id === "string" &&
      admin.id.length >= 36 &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
        admin.id,
      ),
  );
  TestValidator.predicate(
    "created_at/updated_at are valid datetimes",
    typeof admin.created_at === "string" &&
      typeof admin.updated_at === "string",
  );
  TestValidator.equals(
    "admin deletion timestamp null",
    admin.deleted_at ?? null,
    null,
  );
  TestValidator.predicate(
    "last_login_at is null or valid datetime",
    admin.last_login_at === null ||
      admin.last_login_at === undefined ||
      (typeof admin.last_login_at === "string" && !!admin.last_login_at.length),
  );

  // Step 6: Assert tokens are present and correct
  const token = output.token;
  TestValidator.predicate(
    "token.access exists",
    typeof token.access === "string" && !!token.access.length,
  );
  TestValidator.predicate(
    "token.refresh exists",
    typeof token.refresh === "string" && !!token.refresh.length,
  );
  TestValidator.predicate(
    "token.expired_at/refreshable_until valid",
    typeof token.expired_at === "string" &&
      typeof token.refreshable_until === "string",
  );
}
