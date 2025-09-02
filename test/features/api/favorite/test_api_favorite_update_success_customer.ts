import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendFavorite } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendFavorite";

export async function test_api_favorite_update_success_customer(
  connection: api.IConnection,
) {
  /**
   * E2E test: A customer updates their favorite metadata (folder & title).
   *
   * This test verifies a customer can successfully update allowed metadata
   * fields (favorite folder association and title snapshot) through the
   * favorite update endpoint. It follows these steps:
   *
   * 1. Register and authenticate a new customer (creates the context)
   * 2. Synthesize (mock: as creation API is unavailable) an original favorite for
   *    this customer
   * 3. Attempt to update the favorite's folder assignment and title snapshot
   * 4. Validate that the response reflects proper updates, timestamps, and
   *    preserved ownership
   * 5. Test nullification of updatable fields (partial update)
   *
   * Edge cases: Handles partial field updates and ensures null values are
   * accepted.
   */

  // 1. Register a new customer and acquire context
  const joinInput: IShoppingMallAiBackendCustomer.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    phone_number: RandomGenerator.mobile(),
    password: typia.random<string & tags.Format<"password">>(),
    name: RandomGenerator.name(),
    nickname: RandomGenerator.name(1),
  };
  const joinResult: IShoppingMallAiBackendCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, { body: joinInput });
  typia.assert(joinResult);

  // 2. Synthesize a favorite for the customer (since no create API is available)
  const customerId = joinResult.customer.id;
  const favoriteId = typia.random<string & tags.Format<"uuid">>();
  const originalFavorite: IShoppingMallAiBackendFavorite = {
    id: favoriteId,
    shopping_mall_ai_backend_customer_id: customerId,
    shopping_mall_ai_backend_favorite_folder_id: null,
    title_snapshot: "Initial title snapshot",
    target_type: "product",
    target_id_snapshot: typia.random<string & tags.Format<"uuid">>(),
    created_at: new Date().toISOString() as string & tags.Format<"date-time">,
    updated_at: new Date().toISOString() as string & tags.Format<"date-time">,
    deleted_at: null,
  };

  // 3. Prepare the update request: change folder and title_snapshot to new values
  const newFolderId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const newTitleSnapshot = RandomGenerator.paragraph({ sentences: 3 });
  const updateInput: IShoppingMallAiBackendFavorite.IUpdate = {
    shopping_mall_ai_backend_favorite_folder_id: newFolderId,
    title_snapshot: newTitleSnapshot,
  };

  // 4. Update the favorite
  const updatedFavorite: IShoppingMallAiBackendFavorite =
    await api.functional.shoppingMallAiBackend.customer.favorites.update(
      connection,
      {
        favoriteId: originalFavorite.id,
        body: updateInput,
      },
    );
  typia.assert(updatedFavorite);

  // 5. Validate favorite was updated as intended
  TestValidator.equals(
    "Favorite folder ID updated",
    updatedFavorite.shopping_mall_ai_backend_favorite_folder_id,
    newFolderId,
  );
  TestValidator.equals(
    "Favorite title snapshot updated",
    updatedFavorite.title_snapshot,
    newTitleSnapshot,
  );
  TestValidator.equals(
    "Favorite ownership remains the same",
    updatedFavorite.shopping_mall_ai_backend_customer_id,
    customerId,
  );
  TestValidator.notEquals(
    "Favorite updated_at timestamp changed",
    updatedFavorite.updated_at,
    originalFavorite.updated_at,
  );
  TestValidator.equals(
    "Favorite created_at timestamp unchanged",
    updatedFavorite.created_at,
    originalFavorite.created_at,
  );
  TestValidator.equals(
    "Favorite is not deleted",
    updatedFavorite.deleted_at,
    null,
  );

  // 6. Nullify updatable metadata (partial update/edge case)
  const nullUpdateInput: IShoppingMallAiBackendFavorite.IUpdate = {
    shopping_mall_ai_backend_favorite_folder_id: null,
    title_snapshot: null,
  };
  const nullUpdatedFavorite: IShoppingMallAiBackendFavorite =
    await api.functional.shoppingMallAiBackend.customer.favorites.update(
      connection,
      {
        favoriteId: originalFavorite.id,
        body: nullUpdateInput,
      },
    );
  typia.assert(nullUpdatedFavorite);
  TestValidator.equals(
    "Can nullify favorite folder ID via update",
    nullUpdatedFavorite.shopping_mall_ai_backend_favorite_folder_id,
    null,
  );
  TestValidator.equals(
    "Can nullify favorite title snapshot via update",
    nullUpdatedFavorite.title_snapshot,
    null,
  );
}
