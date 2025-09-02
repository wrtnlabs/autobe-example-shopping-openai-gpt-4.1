import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendFavorite } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendFavorite";

export async function test_api_favorite_update_success_admin(
  connection: api.IConnection,
) {
  /**
   * E2E test for updating an admin's favorite's metadata or folder assignment
   *
   * 1. Register & log in as a new admin using /auth/admin/join, setting up an
   *    authenticated admin session.
   * 2. Create a synthetic favorite owned by this admin. (No creation endpoint
   *    provided, so synthesize via random and field swaps.)
   * 3. Choose new values for either shopping_mall_ai_backend_favorite_folder_id or
   *    title_snapshot.
   * 4. Perform PUT /shoppingMallAiBackend/admin/favorites/{favoriteId} with the
   *    update payload.
   * 5. Validate that the response matches the invariants: id, owner id,
   *    target_type, created_at unmodified, but folder/title updated and
   *    updated_at changed.
   */

  // 1. Register & authenticate a new admin
  const adminJoinInput: IShoppingMallAiBackendAdmin.ICreate = {
    username: RandomGenerator.alphaNumeric(8),
    password_hash: RandomGenerator.alphaNumeric(32),
    name: RandomGenerator.name(),
    email: `${RandomGenerator.alphaNumeric(8)}@business.com`,
    phone_number: RandomGenerator.mobile(),
    is_active: true,
  };
  const authorizedAdmin = await api.functional.auth.admin.join(connection, {
    body: adminJoinInput,
  });
  typia.assert(authorizedAdmin);
  const admin = authorizedAdmin.admin;

  // 2. Synthesize a favorite matching admin's id as owner
  const originalFavorite: IShoppingMallAiBackendFavorite = {
    ...typia.random<IShoppingMallAiBackendFavorite>(),
    shopping_mall_ai_backend_customer_id: admin.id,
    deleted_at: null, // Ensure favorite is active
  };
  typia.assert<IShoppingMallAiBackendFavorite>(originalFavorite);

  // 3. Prepare update payload
  const newFolderId = typia.random<string & tags.Format<"uuid">>();
  const newTitleSnapshot = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 4,
    wordMax: 10,
  });
  const updatePayload: IShoppingMallAiBackendFavorite.IUpdate = {
    shopping_mall_ai_backend_favorite_folder_id: newFolderId,
    title_snapshot: newTitleSnapshot,
  };

  // 4. Perform update
  const updatedFavorite =
    await api.functional.shoppingMallAiBackend.admin.favorites.update(
      connection,
      {
        favoriteId: originalFavorite.id,
        body: updatePayload,
      },
    );
  typia.assert(updatedFavorite);

  // 5. Validate fields and business invariants
  TestValidator.equals(
    "favorite id should match",
    updatedFavorite.id,
    originalFavorite.id,
  );
  TestValidator.equals(
    "owner id should match",
    updatedFavorite.shopping_mall_ai_backend_customer_id,
    admin.id,
  );
  TestValidator.equals(
    "target_type fixed",
    updatedFavorite.target_type,
    originalFavorite.target_type,
  );
  TestValidator.equals(
    "title snapshot updated",
    updatedFavorite.title_snapshot,
    updatePayload.title_snapshot,
  );
  TestValidator.equals(
    "folder assignment updated",
    updatedFavorite.shopping_mall_ai_backend_favorite_folder_id,
    updatePayload.shopping_mall_ai_backend_favorite_folder_id,
  );
  TestValidator.notEquals(
    "updated_at should be different",
    updatedFavorite.updated_at,
    originalFavorite.updated_at,
  );
  TestValidator.equals(
    "created_at stays the same",
    updatedFavorite.created_at,
    originalFavorite.created_at,
  );
  TestValidator.equals(
    "favorite is active (not deleted)",
    updatedFavorite.deleted_at,
    null,
  );
}
