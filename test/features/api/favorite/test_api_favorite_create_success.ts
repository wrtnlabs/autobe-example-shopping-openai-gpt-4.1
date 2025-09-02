import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendFavorite } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendFavorite";

export async function test_api_favorite_create_success(
  connection: api.IConnection,
) {
  /**
   * E2E Test: Successful creation of a shopping mall favorite by an
   * authenticated customer.
   *
   * This test simulates a user marking a product as a favorite. It follows the
   * typical business workflow:
   *
   * 1. Customer account registration with auto-authentication
   * 2. Prepare a valid favorite create request (type: product, no folder)
   * 3. Call the "create favorite" endpoint
   * 4. Validate the response for correct linkage, audit fields, and all required
   *    data integrity
   *
   * The test strictly follows the happy path and provides direct business value
   * validation.
   */
  // 1. Register customer (auto-login)
  const joinInput: IShoppingMallAiBackendCustomer.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    phone_number: RandomGenerator.mobile(),
    password: typia.random<string & tags.Format<"password">>(),
    name: RandomGenerator.name(),
    nickname: RandomGenerator.name(1),
  } satisfies IShoppingMallAiBackendCustomer.IJoin;
  const joinOutput: IShoppingMallAiBackendCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: joinInput,
    });
  typia.assert(joinOutput);
  const customerId: string & tags.Format<"uuid"> = joinOutput.customer.id;

  // 2. Prepare favorite creation input (type: product, no folder)
  const createInput: IShoppingMallAiBackendFavorite.ICreate = {
    shopping_mall_ai_backend_customer_id: customerId,
    target_type: "product",
    target_id_snapshot: typia.random<string & tags.Format<"uuid">>(),
    title_snapshot: RandomGenerator.paragraph({ sentences: 2 }),
    shopping_mall_ai_backend_favorite_folder_id: null,
  } satisfies IShoppingMallAiBackendFavorite.ICreate;

  // 3. Call the API to create the favorite
  const favorite: IShoppingMallAiBackendFavorite =
    await api.functional.shoppingMallAiBackend.customer.favorites.create(
      connection,
      {
        body: createInput,
      },
    );
  typia.assert(favorite);

  // 4. Validate response fields and business rules
  TestValidator.equals(
    "favorite links to customer",
    favorite.shopping_mall_ai_backend_customer_id,
    customerId,
  );
  TestValidator.equals(
    "favorite has correct target type",
    favorite.target_type,
    createInput.target_type,
  );
  TestValidator.equals(
    "favorite title snapshot matches",
    favorite.title_snapshot,
    createInput.title_snapshot,
  );
  TestValidator.equals(
    "favorite target_id_snapshot matches",
    favorite.target_id_snapshot,
    createInput.target_id_snapshot,
  );
  TestValidator.equals(
    "audit: created_at is string",
    typeof favorite.created_at,
    "string",
  );
  TestValidator.equals(
    "audit: updated_at is string",
    typeof favorite.updated_at,
    "string",
  );
  TestValidator.equals(
    "favorite folder id null as requested",
    favorite.shopping_mall_ai_backend_favorite_folder_id,
    null,
  );
  TestValidator.equals(
    "favorite is not deleted (deleted_at null)",
    favorite.deleted_at,
    null,
  );
}
