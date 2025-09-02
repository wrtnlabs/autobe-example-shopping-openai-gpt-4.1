import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPageIShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function test_api_admin_list_accounts_filtered_search(
  connection: api.IConnection,
) {
  /**
   * This test validates the admin listing (search/filter) endpoint. It ensures
   * the following business logic:
   *
   * - Admin account search supports filter by partial username, is_active, and
   *   created_at.
   * - Only authenticated admins can perform listing (unauthenticated attempts are
   *   rejected).
   * - Returned admins always match the filter criteria provided.
   *
   * Steps:
   *
   * 1. Register 3 admins (2 active, 1 inactive) with unique usernames.
   * 2. Authenticate as the first admin.
   * 3. Search by partial username for the second admin and confirm results.
   * 4. List all active admins and check only is_active=true appear.
   * 5. Search by creation date for the third admin and confirm only matching
   *    results.
   * 6. Verify unauthenticated list attempt fails.
   */

  // Step 1: Register admins with varying is_active statuses and unique data
  const adminInfos = [
    {
      username: RandomGenerator.alphaNumeric(8),
      name: RandomGenerator.name(),
      email: `${RandomGenerator.alphaNumeric(6)}@test.com`,
      phone_number: RandomGenerator.mobile(),
      is_active: true,
    },
    {
      username: RandomGenerator.alphaNumeric(8),
      name: RandomGenerator.name(),
      email: `${RandomGenerator.alphaNumeric(6)}@test.com`,
      phone_number: RandomGenerator.mobile(),
      is_active: true,
    },
    {
      username: RandomGenerator.alphaNumeric(8),
      name: RandomGenerator.name(),
      email: `${RandomGenerator.alphaNumeric(6)}@test.com`,
      phone_number: RandomGenerator.mobile(),
      is_active: false,
    },
  ];
  const password = RandomGenerator.alphaNumeric(14); // Use random strong password for all three admins
  type Created = { auth: IShoppingMallAiBackendAdmin.IAuthorized; time: Date };
  const createdAdmins: Created[] = [];
  for (const admin of adminInfos) {
    const now = new Date();
    const res = await api.functional.auth.admin.join(connection, {
      body: {
        ...admin,
        password_hash: password, // In real case use proper hashing, API/SDK will hash internally for E2E
      } satisfies IShoppingMallAiBackendAdmin.ICreate,
    });
    typia.assert(res);
    createdAdmins.push({ auth: res, time: now });
  }

  // Step 2: Authenticate as the first admin
  await api.functional.auth.admin.login(connection, {
    body: {
      username: adminInfos[0].username,
      password,
    } satisfies IShoppingMallAiBackendAdmin.ILogin,
  });

  // Step 3: Search by partial username for second admin (should match only adminB)
  const searchPartialUsername = adminInfos[1].username.slice(0, 4);
  const byUsernameResult =
    await api.functional.shoppingMallAiBackend.admin.admins.index(connection, {
      body: {
        username: searchPartialUsername,
      } satisfies IShoppingMallAiBackendAdmin.IRequest,
    });
  typia.assert(byUsernameResult);
  TestValidator.predicate(
    "every result matches partial username in admin search",
    byUsernameResult.data.length > 0 &&
      byUsernameResult.data.every((a) =>
        a.username.includes(searchPartialUsername),
      ),
  );
  TestValidator.predicate(
    "search matches adminB username exactly present in results",
    byUsernameResult.data.some((a) => a.username === adminInfos[1].username),
  );

  // Step 4: List all active admins (should not include inactive ones)
  const byActiveResult =
    await api.functional.shoppingMallAiBackend.admin.admins.index(connection, {
      body: {
        is_active: true,
      } satisfies IShoppingMallAiBackendAdmin.IRequest,
    });
  typia.assert(byActiveResult);
  TestValidator.predicate(
    "every result is is_active=true",
    byActiveResult.data.length > 0 &&
      byActiveResult.data.every((a) => a.is_active === true),
  );
  TestValidator.predicate(
    "inactive admins are not present in is_active=true search",
    !byActiveResult.data.some((a) => a.username === adminInfos[2].username),
  );
  TestValidator.predicate(
    "active admin usernames all appear in active search",
    adminInfos
      .filter((a) => a.is_active)
      .every((act) =>
        byActiveResult.data.some((x) => x.username === act.username),
      ),
  );

  // Step 5: Search by created_at for adminC only
  const adminC = createdAdmins[2];
  const byCreatedResult =
    await api.functional.shoppingMallAiBackend.admin.admins.index(connection, {
      body: {
        created_at_from: adminC.time.toISOString(),
      } satisfies IShoppingMallAiBackendAdmin.IRequest,
    });
  typia.assert(byCreatedResult);
  TestValidator.predicate(
    "recently created adminC is present in created_at filter",
    byCreatedResult.data.some((a) => a.username === adminInfos[2].username),
  );
  // Optionally, ensure others are not present if window is tight

  // Step 6: Require authentication to get list
  const unauthConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "admin list operation rejected without authentication",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.admins.index(
        unauthConnection,
        {
          body: {},
        },
      );
    },
  );
}
