import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendFavorite } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendFavorite";
import type { IPageIShoppingMallAiBackendFavorite } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendFavorite";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Test successful retrieval of all paginated favorites as admin (success
 * path).
 *
 * This scenario validates that an admin can join, authenticate, then list
 * (system-wide or filtered) favorites via the PATCH
 * /shoppingMallAiBackend/admin/favorites endpoint. The test asserts proper
 * admin authentication and correct pagination/data result, confirming
 * type/format for all returned fields.
 *
 * Steps:
 *
 * 1. Register a new admin user, asserting all output structure & type safety.
 * 2. Authenticate the connection as that admin user (automatically via SDK
 *    join).
 * 3. Call the admin favorites listing endpoint with a minimal filter (empty
 *    filter: list all).
 * 4. Assert the response structure, pagination meta, data array properties,
 *    and integrity of all returned fields.
 *
 * No error or edge cases are validated (this is straight success path
 * only).
 */
export async function test_api_admin_favorites_list_success(
  connection: api.IConnection,
) {
  // 1. Register a new admin user (admin join)
  const adminBody = {
    username: RandomGenerator.alphaNumeric(8),
    password_hash: RandomGenerator.alphaNumeric(32),
    name: RandomGenerator.name(),
    email: typia.random<string & tags.Format<"email">>(),
    phone_number: RandomGenerator.mobile(),
    is_active: true,
  } satisfies IShoppingMallAiBackendAdmin.ICreate;

  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: adminBody,
  });
  typia.assert(adminAuth);
  typia.assert(adminAuth.admin);
  typia.assert(adminAuth.token);

  // 2. Retrieve all favorites, paginated, as admin
  const favoritesPage =
    await api.functional.shoppingMallAiBackend.admin.favorites.index(
      connection,
      {
        body: {} satisfies IShoppingMallAiBackendFavorite.IRequest,
      },
    );
  typia.assert(favoritesPage);
  typia.assert(favoritesPage.pagination);
  typia.assert(favoritesPage.data);

  // 3. Check pagination structure & data array
  TestValidator.predicate(
    "admin favorites list result is array",
    Array.isArray(favoritesPage.data),
  );
  TestValidator.predicate(
    "pagination.current is int",
    Number.isInteger(favoritesPage.pagination.current),
  );
  TestValidator.predicate(
    "pagination.limit is int",
    Number.isInteger(favoritesPage.pagination.limit),
  );
  TestValidator.predicate(
    "pagination.pages is int",
    Number.isInteger(favoritesPage.pagination.pages),
  );
  TestValidator.predicate(
    "pagination.records is int",
    Number.isInteger(favoritesPage.pagination.records),
  );

  // 4. If data exists, check structure of first favorite
  if (favoritesPage.data.length > 0) {
    const fav0 = favoritesPage.data[0];
    typia.assert(fav0);
    TestValidator.predicate(
      "favorite id is uuid",
      typeof fav0.id === "string" && /^[0-9a-f\-]{36}$/.test(fav0.id),
    );
    TestValidator.predicate(
      "favorite has valid target_type",
      typeof fav0.target_type === "string" && fav0.target_type.length > 0,
    );
    TestValidator.equals(
      "favorite created_at is string",
      typeof fav0.created_at,
      "string",
    );
    if (fav0.title_snapshot !== undefined && fav0.title_snapshot !== null) {
      TestValidator.equals(
        "title_snapshot is string if present",
        typeof fav0.title_snapshot,
        "string",
      );
    }
  }
}
