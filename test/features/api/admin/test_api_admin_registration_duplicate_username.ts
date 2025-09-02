import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function test_api_admin_registration_duplicate_username(
  connection: api.IConnection,
) {
  /**
   * Test that registering an admin with an already existing username fails.
   *
   * Business workflow:
   *
   * 1. Generate unique admin account details (username, password_hash, name,
   *    email, phone, is_active)
   * 2. Register admin successfully (expect success)
   * 3. Attempt second registration using the same username (with fresh email and
   *    name)
   * 4. Confirm that API rejects the duplicate username with a validation error
   */

  // 1. Generate registration data
  const username: string = RandomGenerator.alphaNumeric(10);
  const passwordHash: string = RandomGenerator.alphaNumeric(64);
  const name: string = RandomGenerator.name();
  const email: string = `${RandomGenerator.alphaNumeric(10)}@malladmin.com`;
  const phone_number: string = RandomGenerator.mobile();
  const is_active = true;

  // 2. Register admin (should succeed)
  const firstJoin = await api.functional.auth.admin.join(connection, {
    body: {
      username,
      password_hash: passwordHash,
      name,
      email,
      phone_number,
      is_active,
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });
  typia.assert(firstJoin);
  TestValidator.equals(
    "registered admin username matches input",
    firstJoin.admin.username,
    username,
  );
  TestValidator.equals(
    "registered admin is_active is true",
    firstJoin.admin.is_active,
    true,
  );

  // 3. Attempt duplicate registration (should fail)
  const dupJoinInput: IShoppingMallAiBackendAdmin.ICreate = {
    username, // intentionally same as before
    password_hash: RandomGenerator.alphaNumeric(64),
    name: RandomGenerator.name(),
    email: `${RandomGenerator.alphaNumeric(10)}@malladmin.com`, // ensure this is random and different
    phone_number: RandomGenerator.mobile(),
    is_active: true,
  };
  await TestValidator.error(
    "should reject admin registration with duplicate username",
    async () => {
      await api.functional.auth.admin.join(connection, {
        body: dupJoinInput,
      });
    },
  );
}
