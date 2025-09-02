import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function test_api_admin_registration_duplicate_email(
  connection: api.IConnection,
) {
  /**
   * E2E test for preventing duplicate admin registration by email.
   *
   * 1. Register a new admin with a unique, random business email.
   * 2. Attempt to register a different admin with the exact same email but a
   *    different username.
   * 3. Confirm that the API rejects the second registration with a duplicate email
   *    validation error.
   *
   * This ensures the unique constraint on admin email addresses is correctly
   * enforced.
   */
  const uniqueEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const firstUsername = RandomGenerator.name(1);
  const firstName = RandomGenerator.name();
  const firstPasswordHash = RandomGenerator.alphaNumeric(32);
  // Register initial admin
  const firstAdmin = await api.functional.auth.admin.join(connection, {
    body: {
      username: firstUsername,
      password_hash: firstPasswordHash,
      name: firstName,
      email: uniqueEmail,
      is_active: true,
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });
  typia.assert(firstAdmin);
  TestValidator.equals(
    "first admin email matches input",
    firstAdmin.admin.email,
    uniqueEmail,
  );
  // Attempt duplicate admin registration with same email and different username
  const secondUsername = RandomGenerator.name(1);
  const secondName = RandomGenerator.name();
  const secondPasswordHash = RandomGenerator.alphaNumeric(32);
  await TestValidator.error(
    "duplicate admin email registration should fail",
    async () => {
      await api.functional.auth.admin.join(connection, {
        body: {
          username: secondUsername,
          password_hash: secondPasswordHash,
          name: secondName,
          email: uniqueEmail,
          is_active: true,
        } satisfies IShoppingMallAiBackendAdmin.ICreate,
      });
    },
  );
}
