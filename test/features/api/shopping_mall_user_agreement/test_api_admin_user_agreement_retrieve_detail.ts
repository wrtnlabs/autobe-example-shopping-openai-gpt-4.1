import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallUserAgreement } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallUserAgreement";

/**
 * Validate admin retrieval of a user agreement record with both success and
 * error scenarios.
 *
 * This test ensures:
 *
 * 1. Successful admin registration.
 * 2. Retrieval of a sample user agreement record by admin (using simulated data).
 * 3. Response includes all agreement/audit fields, and admin access reveals all
 *    necessary details.
 * 4. Retrieval with a non-existent userAgreementId triggers error.
 * 5. Test that access is denied when connection is not authenticated as admin.
 */
export async function test_api_admin_user_agreement_retrieve_detail(
  connection: api.IConnection,
) {
  // Step 1: Admin registration
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminName = RandomGenerator.name();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        name: adminName,
      } satisfies IShoppingMallAdmin.IJoin,
    });
  typia.assert(admin);

  // Step 2: Create a simulated user agreement (as DB insert/mutation API is not exposed)
  // We'll use typia.random to generate a valid user agreement record
  const agreement: IShoppingMallUserAgreement =
    typia.random<IShoppingMallUserAgreement>();
  typia.assert(agreement);

  // Step 3: Use the admin endpoint to retrieve this agreement by ID (simulate backend with .simulate = true)
  const simConn: api.IConnection = { ...connection, simulate: true };
  const result: IShoppingMallUserAgreement =
    await api.functional.shoppingMall.admin.userAgreements.at(simConn, {
      userAgreementId: agreement.id,
    });
  typia.assert(result);

  // Step 4: Validate all core regulatory/audit fields and that all info is visible for admin
  TestValidator.equals("agreement id matches", result.id, agreement.id);
  TestValidator.equals("actor id matches", result.actor_id, agreement.actor_id);
  TestValidator.equals(
    "actor type present",
    typeof result.actor_type,
    "string",
  );
  TestValidator.equals(
    "agreement type present",
    typeof result.agreement_type,
    "string",
  );
  TestValidator.equals("version present", typeof result.version, "string");
  TestValidator.equals(
    "accepted_at present",
    typeof result.accepted_at,
    "string",
  );
  TestValidator.equals(
    "created_at present",
    typeof result.created_at,
    "string",
  );
  TestValidator.predicate(
    "withdrawn_at is string or null or undefined (nullable)",
    result.withdrawn_at === null ||
      result.withdrawn_at === undefined ||
      typeof result.withdrawn_at === "string",
  );

  // Step 5: Try retrieval with a non-existent/invalid userAgreementId (random UUID not matching agreement.id)
  await TestValidator.error(
    "fetching non-existent userAgreementId triggers error",
    async () => {
      await api.functional.shoppingMall.admin.userAgreements.at(simConn, {
        userAgreementId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );

  // Step 6: Attempt retrieval with unauthenticated connection (headers are blanked)
  const unauthConn: api.IConnection = { ...simConn, headers: {} };
  await TestValidator.error(
    "unauthenticated connection is denied access",
    async () => {
      await api.functional.shoppingMall.admin.userAgreements.at(unauthConn, {
        userAgreementId: agreement.id,
      });
    },
  );
}
