import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPageIShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function test_api_admin_list_accounts_basic_search(
  connection: api.IConnection,
) {
  /**
   * Verify search and listing of admin accounts works as expected:
   *
   * 1. Register a new admin via /auth/admin/join and authenticate as admin
   *    (context required)
   * 2. List admin accounts with PATCH /shoppingMallAiBackend/admin/admins
   *    endpoint, default criteria (no filter, paging).
   * 3. Check that the created admin is present in the listing with correct summary
   *    fields
   * 4. Check pagination/result count is >= 1
   * 5. Test filtering by username (search - expect only the created admin)
   */
  // 1. Register new admin via join and authenticate
  const joinBody: IShoppingMallAiBackendAdmin.ICreate = {
    username: RandomGenerator.alphaNumeric(10),
    password_hash: RandomGenerator.alphaNumeric(32), // simulate hashed password
    name: RandomGenerator.name(),
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    phone_number: RandomGenerator.mobile(),
    is_active: true,
  };
  const authorized = await api.functional.auth.admin.join(connection, {
    body: joinBody,
  });
  typia.assert(authorized);
  const admin = authorized.admin;

  // 2. List admins with default (unfiltered) paging parameters
  const response =
    await api.functional.shoppingMallAiBackend.admin.admins.index(connection, {
      body: {},
    });
  typia.assert(response);

  // 3. Confirm created admin is included in the result data
  const found = response.data.find((a) => a.id === admin.id);
  TestValidator.predicate(
    "newly created admin must appear in search results",
    !!found,
  );
  TestValidator.equals(
    "admin username matches",
    found?.username,
    joinBody.username,
  );
  TestValidator.equals("admin name matches", found?.name, joinBody.name);
  TestValidator.equals("admin email matches", found?.email, joinBody.email);
  TestValidator.equals("account should be active", found?.is_active, true);
  TestValidator.equals("admin id matches", found?.id, admin.id);
  // Additional: Check summary timestamps (created/updated) exist in response object
  TestValidator.predicate(
    "admin summary contains created_at",
    typeof found?.created_at === "string" && !!found?.created_at,
  );
  TestValidator.predicate(
    "admin summary contains updated_at",
    typeof found?.updated_at === "string" && !!found?.updated_at,
  );
  // 4. Validate paging metadata is present and at least 1 admin is in records
  TestValidator.predicate(
    "pagination.records is >= 1",
    response.pagination.records >= 1,
  );
  TestValidator.predicate(
    "pagination.limit is positive",
    response.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination.current page is 1+",
    response.pagination.current >= 1,
  );
  // 5. Test search/filter by username (should precisely yield the new admin)
  const filtered =
    await api.functional.shoppingMallAiBackend.admin.admins.index(connection, {
      body: { username: joinBody.username },
    });
  typia.assert(filtered);
  TestValidator.equals(
    "filtered admin list has exactly 1 entry",
    filtered.data.length,
    1,
  );
  TestValidator.equals(
    "filtered admin matches id",
    filtered.data[0].id,
    admin.id,
  );
  TestValidator.equals(
    "filtered admin username matches",
    filtered.data[0].username,
    joinBody.username,
  );
  TestValidator.equals(
    "filtered admin email matches",
    filtered.data[0].email,
    joinBody.email,
  );
}
