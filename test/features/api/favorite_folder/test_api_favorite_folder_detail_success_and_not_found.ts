import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendFavoriteFolder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendFavoriteFolder";

export async function test_api_favorite_folder_detail_success_and_not_found(
  connection: api.IConnection,
) {
  /**
   * Test retrieving a customer's specific favorite folder detail and negative
   * lookup.
   *
   * 1. Register a new customer (establishes authentication and ownership).
   * 2. Create a favorite folder with both required and optional metadata.
   * 3. Retrieve the folder by ID and validate all metadata and configuration
   *    fields match creation input.
   * 4. Confirm proper not found error is returned for non-existent
   *    favoriteFolderId.
   *
   * Success means correct data retrieval, field parity, and robust error
   * handling for foreign/random IDs.
   */

  // 1. Register a new customer
  const customerJoin: IShoppingMallAiBackendCustomer.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    phone_number: RandomGenerator.mobile(),
    password: "TestPassword1!@#",
    name: RandomGenerator.name(),
    nickname: RandomGenerator.name(),
  } satisfies IShoppingMallAiBackendCustomer.IJoin;
  const auth = await api.functional.auth.customer.join(connection, {
    body: customerJoin,
  });
  typia.assert(auth);
  const customer = auth.customer;

  // 2. Create a favorite folder (required and optional fields)
  const folderCreate: IShoppingMallAiBackendFavoriteFolder.ICreate = {
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IShoppingMallAiBackendFavoriteFolder.ICreate;
  const createdFolder =
    await api.functional.shoppingMallAiBackend.customer.favoriteFolders.createFavoriteFolder(
      connection,
      { body: folderCreate },
    );
  typia.assert(createdFolder);

  // 3. Retrieve the folder detail by ID and check all fields
  const detail =
    await api.functional.shoppingMallAiBackend.customer.favoriteFolders.atFavoriteFolder(
      connection,
      { favoriteFolderId: createdFolder.id },
    );
  typia.assert(detail);
  TestValidator.equals(
    "Favorite folder - id parity",
    detail.id,
    createdFolder.id,
  );
  TestValidator.equals(
    "Favorite folder - customer id parity",
    detail.shopping_mall_ai_backend_customer_id,
    customer.id,
  );
  TestValidator.equals(
    "Favorite folder - name parity",
    detail.name,
    folderCreate.name,
  );
  TestValidator.equals(
    "Favorite folder - description parity",
    detail.description,
    folderCreate.description,
  );
  TestValidator.predicate(
    "Favorite folder not deleted",
    detail.deleted_at === null || detail.deleted_at === undefined,
  );
  TestValidator.predicate(
    "Favorite folder created_at is ISO timestamp",
    typeof detail.created_at === "string" &&
      /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:.+/.test(detail.created_at),
  );
  TestValidator.predicate(
    "Favorite folder updated_at is ISO timestamp",
    typeof detail.updated_at === "string" &&
      /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:.+/.test(detail.updated_at),
  );

  // 4. Negative: lookup with a random non-existent favoriteFolderId
  await TestValidator.error(
    "Favorite folder detail endpoint returns error for random non-existent favoriteFolderId",
    async () => {
      await api.functional.shoppingMallAiBackend.customer.favoriteFolders.atFavoriteFolder(
        connection,
        {
          favoriteFolderId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
