import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendFavorite } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendFavorite";

export async function test_api_admin_favorite_details_success(
  connection: api.IConnection,
) {
  /**
   * Validates successful retrieval of a favorite by its ID as an authenticated
   * admin.
   *
   * Scenario steps:
   *
   * 1. Register an admin account and ensure authentication context is established
   * 2. Create a favorite using the authenticated admin
   * 3. Fetch the favorite details by favoriteId and compare all fields for
   *    consistency
   */

  // Step 1: Create a new admin account
  const adminUsername = RandomGenerator.alphaNumeric(10);
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminEmail = `${RandomGenerator.alphaNumeric(8)}@testdomain.com`;
  const adminName = RandomGenerator.name();
  const adminJoinRes = await api.functional.auth.admin.join(connection, {
    body: {
      username: adminUsername,
      password_hash: adminPassword,
      name: adminName,
      email: adminEmail,
      is_active: true,
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });
  typia.assert(adminJoinRes);

  // Step 2: Create a favorite as this admin
  // Simulate a favorite for a customer (use a generated customer ID for the favorite's owner)
  const customerId = typia.random<string & tags.Format<"uuid">>();
  const favoriteTitle = RandomGenerator.paragraph({ sentences: 2 });
  const favoriteType = RandomGenerator.pick([
    "product",
    "address",
    "inquiry",
    "promotion",
    "event",
  ] as const);
  const targetIdSnapshot = typia.random<string & tags.Format<"uuid">>();
  const createFavoriteReq: IShoppingMallAiBackendFavorite.ICreate = {
    shopping_mall_ai_backend_customer_id: customerId,
    title_snapshot: favoriteTitle,
    target_type: favoriteType,
    target_id_snapshot: targetIdSnapshot,
    shopping_mall_ai_backend_favorite_folder_id: null,
  };
  const createdFavorite =
    await api.functional.shoppingMallAiBackend.admin.favorites.create(
      connection,
      {
        body: createFavoriteReq,
      },
    );
  typia.assert(createdFavorite);

  // Step 3: Retrieve the favorite details via GET and validate all fields
  const retrievedFavorite =
    await api.functional.shoppingMallAiBackend.admin.favorites.at(connection, {
      favoriteId: createdFavorite.id,
    });
  typia.assert(retrievedFavorite);

  // Field-wise equality checks
  TestValidator.equals(
    "favorite id should match",
    retrievedFavorite.id,
    createdFavorite.id,
  );
  TestValidator.equals(
    "customer id should match",
    retrievedFavorite.shopping_mall_ai_backend_customer_id,
    createdFavorite.shopping_mall_ai_backend_customer_id,
  );
  TestValidator.equals(
    "favorite folder should match",
    retrievedFavorite.shopping_mall_ai_backend_favorite_folder_id,
    createdFavorite.shopping_mall_ai_backend_favorite_folder_id,
  );
  TestValidator.equals(
    "title_snapshot should match",
    retrievedFavorite.title_snapshot,
    createdFavorite.title_snapshot,
  );
  TestValidator.equals(
    "target_type should match",
    retrievedFavorite.target_type,
    createdFavorite.target_type,
  );
  TestValidator.equals(
    "target_id_snapshot should match",
    retrievedFavorite.target_id_snapshot,
    createdFavorite.target_id_snapshot,
  );
  TestValidator.predicate(
    "favorite has created_at timestamp",
    typeof retrievedFavorite.created_at === "string" &&
      !!retrievedFavorite.created_at,
  );
  TestValidator.predicate(
    "favorite has updated_at timestamp",
    typeof retrievedFavorite.updated_at === "string" &&
      !!retrievedFavorite.updated_at,
  );
  TestValidator.equals(
    "deleted_at is null on active favorite",
    retrievedFavorite.deleted_at,
    null,
  );
}
