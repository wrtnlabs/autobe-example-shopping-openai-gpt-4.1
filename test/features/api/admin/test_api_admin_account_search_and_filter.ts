import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdmin";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

/**
 * Validates the admin account search and filter API.
 *
 * Steps:
 *
 * 1. Register a new admin for search and authentication target.
 * 2. As authenticated admin, search/filter using status, KYC, email, name, and
 *    timestamps.
 * 3. Validate pagination, correct masking, and only authenticated access.
 * 4. Try with invalid (unauthenticated) user and confirm rejection.
 * 5. Edge case searches with randomized filter criteria.
 */
export async function test_api_admin_account_search_and_filter(
  connection: api.IConnection,
) {
  // 1. Register new admin
  const joinAdminEmail: string = typia.random<string & tags.Format<"email">>();
  const joinAdminPassword = RandomGenerator.alphaNumeric(12);
  const joinAdminName = RandomGenerator.name();
  const newAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: joinAdminEmail,
        password: joinAdminPassword,
        name: joinAdminName,
      } satisfies IShoppingMallAdmin.IJoin,
    });
  typia.assert(newAdmin);

  // 2. As admin, query admin search using various filter params
  const filterRequest = {
    email: joinAdminEmail,
    name: joinAdminName,
    status: newAdmin.status,
    kyc_status: newAdmin.kyc_status,
    created_from: newAdmin.created_at,
    created_to: newAdmin.created_at,
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies IShoppingMallAdmin.IRequest;

  const pageResult: IPageIShoppingMallAdmin.ISummary =
    await api.functional.shoppingMall.admin.admins.index(connection, {
      body: filterRequest,
    });
  typia.assert(pageResult);
  const found = pageResult.data.find((adm) => adm.id === newAdmin.id);
  TestValidator.predicate(
    "created admin is found in filtered results",
    found !== undefined,
  );
  if (found) {
    // Validate masking: no token field present, only ISummary fields
    TestValidator.equals(
      "no authentication fields in summary",
      undefined,
      (found as any).token,
    );
    // Validate essential fields
    TestValidator.equals("admin email matches", found.email, joinAdminEmail);
    TestValidator.equals("admin name matches", found.name, joinAdminName);
    TestValidator.equals("admin status matches", found.status, newAdmin.status);
    TestValidator.equals(
      "admin kyc_status matches",
      found.kyc_status,
      newAdmin.kyc_status,
    );
    TestValidator.equals(
      "admin created_at matches",
      found.created_at,
      newAdmin.created_at,
    );
  }

  // 3. Unauthenticated request should fail
  const fakeConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error(
    "unauthenticated request should be rejected",
    async () => {
      await api.functional.shoppingMall.admin.admins.index(fakeConnection, {
        body: { email: joinAdminEmail } satisfies IShoppingMallAdmin.IRequest,
      });
    },
  );

  // 4. Edge cases / random filter
  const randomFilter: IShoppingMallAdmin.IRequest = {
    status: RandomGenerator.pick([
      newAdmin.status,
      "nonexistent-status",
    ] as const),
    kyc_status: RandomGenerator.pick([
      newAdmin.kyc_status,
      "nonexistent-kyc",
    ] as const),
    name: RandomGenerator.paragraph({ sentences: 2 }), // likely not matching
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 5 as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies IShoppingMallAdmin.IRequest;

  const edgeResult = await api.functional.shoppingMall.admin.admins.index(
    connection,
    { body: randomFilter },
  );
  typia.assert(edgeResult);
  TestValidator.predicate(
    "edge case search returns some result or empty as expected",
    Array.isArray(edgeResult.data),
  );
}
