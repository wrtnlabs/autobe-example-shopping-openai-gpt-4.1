import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Test admin profile update (success and validation).
 *
 * Steps:
 *
 * 1. Create first admin via POST /auth/admin/join (establishes
 *    authentication).
 * 2. Create second admin to test duplicate value constraint.
 * 3. Update the first admin's profile using PUT
 *    /shoppingMallAiBackend/admin/admins/{adminId} with new (valid) values
 *    for name, email, and phone_number. Assert the changes.
 * 4. Attempt to update the first admin's email to the second admin's email,
 *    expecting a uniqueness validation failure. Assert that an error is
 *    thrown.
 *
 * Notes: The test covers both a valid update and a business rule violation
 * (duplicate email). Audit log inspection is implied by state change
 * validation (API does not expose logs). The test assumes password cannot
 * be edited via this endpoint and only allowed fields (name, email,
 * phone_number, is_active) are updatable.
 */
export async function test_api_admin_account_profile_update_success_and_validation(
  connection: api.IConnection,
) {
  // 1. Create first admin
  const admin1Input: IShoppingMallAiBackendAdmin.ICreate = {
    username: RandomGenerator.alphaNumeric(8),
    password_hash: RandomGenerator.alphaNumeric(32),
    name: RandomGenerator.name(),
    email: `${RandomGenerator.alphaNumeric(6)}1@example.com`,
    is_active: true,
    phone_number: RandomGenerator.mobile(),
  };
  const admin1 = await api.functional.auth.admin.join(connection, {
    body: admin1Input,
  });
  typia.assert(admin1);
  const admin1Profile = admin1.admin;

  // 2. Create second admin
  const admin2Input: IShoppingMallAiBackendAdmin.ICreate = {
    username: RandomGenerator.alphaNumeric(8),
    password_hash: RandomGenerator.alphaNumeric(32),
    name: RandomGenerator.name(),
    email: `${RandomGenerator.alphaNumeric(6)}2@example.com`,
    is_active: true,
    phone_number: RandomGenerator.mobile(),
  };
  const admin2 = await api.functional.auth.admin.join(connection, {
    body: admin2Input,
  });
  typia.assert(admin2);
  const admin2Profile = admin2.admin;

  // 3. Update admin1 profile
  const updatedProfile = {
    name: RandomGenerator.name(),
    email: `${RandomGenerator.alphaNumeric(9)}@example.org`,
    phone_number: RandomGenerator.mobile(),
    is_active: false,
  } satisfies IShoppingMallAiBackendAdmin.IUpdate;
  const updated =
    await api.functional.shoppingMallAiBackend.admin.admins.update(connection, {
      adminId: admin1Profile.id,
      body: updatedProfile,
    });
  typia.assert(updated);
  TestValidator.equals(
    "admin name was updated",
    updated.name,
    updatedProfile.name,
  );
  TestValidator.equals(
    "admin email was updated",
    updated.email,
    updatedProfile.email,
  );
  TestValidator.equals(
    "admin phone was updated",
    updated.phone_number,
    updatedProfile.phone_number,
  );
  TestValidator.equals(
    "admin is_active was updated",
    updated.is_active,
    updatedProfile.is_active,
  );

  // 4. Try to update admin1 email to admin2's email (should fail with uniqueness error)
  await TestValidator.error(
    "updating admin with duplicate email should fail",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.admins.update(
        connection,
        {
          adminId: admin1Profile.id,
          body: {
            email: admin2Profile.email,
          } satisfies IShoppingMallAiBackendAdmin.IUpdate,
        },
      );
    },
  );
}
