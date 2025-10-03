import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

/**
 * Validate successful admin registration and token issuance (happy path &
 * duplicate failure).
 *
 * 1. Prepare a unique admin registration payload (business email, password, name)
 *    per schema.
 * 2. Submit a registration request to /auth/admin/join.
 *
 *    - Assert response structure matches IShoppingMallAdmin.IAuthorized, including
 *         tokens.
 *    - Validate presence and format of required audit fields (status, kyc_status,
 *         created_at, updated_at).
 *    - Assert no prior authentication required (public endpoint).
 * 3. Attempt to register a second admin with the same email and credentials.
 *
 *    - Assert that this fails, verifying uniqueness constraint (email).
 *    - Assert the error triggers without returning a valid IAuthorized object.
 */
export async function test_api_admin_registration_and_auth_token_issuance(
  connection: api.IConnection,
) {
  // 1. Prepare unique registration payload
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16); // choose a reasonably strong password
  const name = RandomGenerator.name();
  const joinBody = {
    email,
    password,
    name,
  } satisfies IShoppingMallAdmin.IJoin;

  // 2. Register admin successfully
  const authorized = await api.functional.auth.admin.join(connection, {
    body: joinBody,
  });
  typia.assert(authorized);
  // Validate returned fields match input (business logic)
  TestValidator.equals(
    "registered admin email matches input",
    authorized.email,
    email,
  );
  TestValidator.equals(
    "registered admin name matches input",
    authorized.name,
    name,
  );

  // 3. Attempt duplicate registration (same email & password)
  await TestValidator.error(
    "duplicate admin registration should fail",
    async () => {
      await api.functional.auth.admin.join(connection, { body: joinBody });
    },
  );
}
