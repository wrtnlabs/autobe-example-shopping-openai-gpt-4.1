import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendFavorite } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendFavorite";

export async function test_api_admin_favorite_creation_success(
  connection: api.IConnection,
) {
  /**
   * Test the successful creation of a favorite entry by an administrator.
   *
   * Business context: Ensures that an admin can authenticate and create a
   * favorite entry via POST /shoppingMallAiBackend/admin/favorites, with all
   * business and type rules satisfied. This function verifies that favorites
   * can be created using valid and complete request data, and that all returned
   * fields are as expected, including evidence for audit, system fields, and
   * correct owner assignment.
   *
   * Steps:
   *
   * 1. Register a new admin user using /auth/admin/join.
   * 2. Authenticate as the new admin (token automatically handled in connection).
   * 3. Prepare a valid favorite creation request, supplying all required fields
   *    (customer_id, target_type, etc), with realistic random values.
   * 4. Call the favorite creation endpoint
   *    (/shoppingMallAiBackend/admin/favorites).
   * 5. Validate the successful response: check type, required fields, and
   *    correctness of returned audit information (created_at, updated_at, user
   *    assignments).
   */

  // 1. Register a new admin account and authenticate
  const uniqueEmail = typia.random<string & tags.Format<"email">>();
  const username = RandomGenerator.alphabets(10);
  const name = RandomGenerator.name(2);
  const passwordHash = RandomGenerator.alphaNumeric(32);
  const phoneNumber = RandomGenerator.mobile();
  const adminJoinResponse = await api.functional.auth.admin.join(connection, {
    body: {
      username,
      password_hash: passwordHash,
      name,
      email: uniqueEmail,
      phone_number: phoneNumber,
      is_active: true,
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });
  typia.assert(adminJoinResponse);

  // 2. Prepare valid favorite creation request data
  const customerId = typia.random<string & tags.Format<"uuid">>();
  const favoriteFolderId = typia.random<string & tags.Format<"uuid">>();
  const titleSnapshot = RandomGenerator.paragraph({ sentences: 3 });
  const targetType = RandomGenerator.pick([
    "product",
    "address",
    "inquiry",
  ] as const);
  const targetIdSnapshot = typia.random<string & tags.Format<"uuid">>();

  // 3. Create the favorite
  const favorite =
    await api.functional.shoppingMallAiBackend.admin.favorites.create(
      connection,
      {
        body: {
          shopping_mall_ai_backend_customer_id: customerId,
          shopping_mall_ai_backend_favorite_folder_id: favoriteFolderId,
          title_snapshot: titleSnapshot,
          target_type: targetType,
          target_id_snapshot: targetIdSnapshot,
        } satisfies IShoppingMallAiBackendFavorite.ICreate,
      },
    );
  typia.assert(favorite);

  // 4. Validate response details and audit fields
  TestValidator.equals(
    "favorite owner customer_id matches input",
    favorite.shopping_mall_ai_backend_customer_id,
    customerId,
  );
  TestValidator.equals(
    "favorite folder_id matches input",
    favorite.shopping_mall_ai_backend_favorite_folder_id,
    favoriteFolderId,
  );
  TestValidator.equals(
    "favorite title_snapshot matches input",
    favorite.title_snapshot,
    titleSnapshot,
  );
  TestValidator.equals(
    "favorite target_type matches input",
    favorite.target_type,
    targetType,
  );
  TestValidator.equals(
    "favorite target_id_snapshot matches input",
    favorite.target_id_snapshot,
    targetIdSnapshot,
  );
  TestValidator.predicate(
    "favorite id should be a non-empty uuid",
    typeof favorite.id === "string" && favorite.id.length > 0,
  );
  TestValidator.predicate(
    "creation audit field created_at must be ISO string",
    typeof favorite.created_at === "string" &&
      !Number.isNaN(Date.parse(favorite.created_at)),
  );
  TestValidator.predicate(
    "audit field updated_at must be ISO string",
    typeof favorite.updated_at === "string" &&
      !Number.isNaN(Date.parse(favorite.updated_at)),
  );
  TestValidator.predicate(
    "favorite not deleted on creation (deleted_at is null or undefined)",
    favorite.deleted_at === null || favorite.deleted_at === undefined,
  );
}
