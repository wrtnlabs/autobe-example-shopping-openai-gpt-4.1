import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * E2E Test: Admin Account Detail Access Control and Audit.
 *
 * Validates that:
 *
 * 1. Admins can retrieve their own full account details after registration.
 * 2. Authentication context is properly switched on each join (SDK-managed).
 * 3. Another admin cannot directly access another admin's account details
 *    (forbidden/unauthorized unless policy allows).
 * 4. All access is strictly verified with TestValidator, with negative
 *    coverage for forbidden cross-access scenarios.
 * 5. All test data uses realistic random values and type-safe assertions at
 *    every step.
 *
 * Steps:
 *
 * 1. Create admin1 and log in via join. Retrieve and validate own profile
 *    fields for correctness and full detail response.
 * 2. Create admin2 and log in; attempt to access admin1's details and validate
 *    rejection/forbidden response.
 *
 * Note: Scenario omits soft deletion and policy nuances (e.g.,
 * super-admins) as those are not implementable via current API. Connection
 * context switching is handled by SDK join and never manually.
 */
export async function test_api_admin_account_detail_access_control_and_audit(
  connection: api.IConnection,
) {
  // 1. Create and log in as the first admin
  const admin1Username: string = RandomGenerator.name();
  const admin1Email: string & tags.Format<"email"> =
    `${RandomGenerator.alphaNumeric(8)}@test.com` as string &
      tags.Format<"email">;
  const admin1PasswordHash: string = RandomGenerator.alphaNumeric(32);
  const admin1Name: string = RandomGenerator.name();
  const admin1Phone: string = RandomGenerator.mobile();
  const admin1Create: IShoppingMallAiBackendAdmin.ICreate = {
    username: admin1Username,
    password_hash: admin1PasswordHash,
    name: admin1Name,
    email: admin1Email,
    phone_number: admin1Phone,
    is_active: true,
  };
  const admin1JoinResp: IShoppingMallAiBackendAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: admin1Create });
  typia.assert(admin1JoinResp);
  const admin1Id: string & tags.Format<"uuid"> = admin1JoinResp.admin.id;

  // 2. Retrieve admin1's own account detail, verify contents
  const admin1Profile: IShoppingMallAiBackendAdmin =
    await api.functional.shoppingMallAiBackend.admin.admins.at(connection, {
      adminId: admin1Id,
    });
  typia.assert(admin1Profile);
  TestValidator.equals(
    "self profile: username matches",
    admin1Profile.username,
    admin1Username,
  );
  TestValidator.equals(
    "self profile: email matches",
    admin1Profile.email,
    admin1Email,
  );
  TestValidator.equals(
    "self profile: phone_number matches",
    admin1Profile.phone_number,
    admin1Phone,
  );
  TestValidator.equals(
    "self profile: name matches",
    admin1Profile.name,
    admin1Name,
  );
  TestValidator.predicate(
    "self profile: is_active is true",
    admin1Profile.is_active === true,
  );
  TestValidator.equals("self profile: id matches", admin1Profile.id, admin1Id);

  // 3. Create a second admin and log in, switching context
  const admin2Username: string = RandomGenerator.name();
  const admin2Email: string & tags.Format<"email"> =
    `${RandomGenerator.alphaNumeric(8)}@test.com` as string &
      tags.Format<"email">;
  const admin2PasswordHash: string = RandomGenerator.alphaNumeric(32);
  const admin2Name: string = RandomGenerator.name();
  const admin2Phone: string = RandomGenerator.mobile();
  const admin2Create: IShoppingMallAiBackendAdmin.ICreate = {
    username: admin2Username,
    password_hash: admin2PasswordHash,
    name: admin2Name,
    email: admin2Email,
    phone_number: admin2Phone,
    is_active: true,
  };
  const admin2JoinResp: IShoppingMallAiBackendAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: admin2Create });
  typia.assert(admin2JoinResp);

  // 4. Attempt to access admin1's profile with admin2's authentication (should be forbidden)
  await TestValidator.error(
    "forbidden: admin2 cannot access admin1's profile",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.admins.at(connection, {
        adminId: admin1Id,
      });
    },
  );
}
