import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendFavoriteFolder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendFavoriteFolder";

export async function test_api_favorite_folder_creation_and_duplicate_name_error(
  connection: api.IConnection,
) {
  /**
   * E2E: Favorite Folder Creation and Duplicate Name Error Handling
   *
   * This test validates that a customer can create a favorite folder and that
   * duplicate folder names per customer are not permitted.
   *
   * Process:
   *
   * 1. Register a customer via /auth/customer/join to obtain authentication and
   *    context.
   * 2. Create a favorite folder for this customer, providing a unique name and
   *    description; validate ownership and properties.
   * 3. Attempt to create a favorite folder with the same name; confirm that the
   *    API enforces uniqueness and an error is raised.
   */

  // 1. Customer registration for authentication context
  const email = typia.random<string & tags.Format<"email">>();
  const phone_number = RandomGenerator.mobile();
  const password = RandomGenerator.alphaNumeric(12);
  const name = RandomGenerator.name();
  const nickname = RandomGenerator.name(1);

  const joinResp = await api.functional.auth.customer.join(connection, {
    body: {
      email,
      phone_number,
      password,
      name,
      nickname,
    } satisfies IShoppingMallAiBackendCustomer.IJoin,
  });
  typia.assert(joinResp);
  const customerId = joinResp.customer.id;

  // 2. Customer creates a favorite folder with unique name
  const folderName = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 4,
    wordMax: 8,
  });
  const folderDescription = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 7,
    wordMax: 14,
  });

  const createdFolder =
    await api.functional.shoppingMallAiBackend.customer.favoriteFolders.createFavoriteFolder(
      connection,
      {
        body: {
          name: folderName,
          description: folderDescription,
        } satisfies IShoppingMallAiBackendFavoriteFolder.ICreate,
      },
    );
  typia.assert(createdFolder);

  TestValidator.equals(
    "favorite folder name matches request",
    createdFolder.name,
    folderName,
  );
  TestValidator.equals(
    "favorite folder description matches request",
    createdFolder.description,
    folderDescription,
  );
  TestValidator.equals(
    "favorite folder is owned by registered customer",
    createdFolder.shopping_mall_ai_backend_customer_id,
    customerId,
  );
  TestValidator.predicate(
    "created favorite folder has valid id",
    typeof createdFolder.id === "string" && createdFolder.id.length > 0,
  );
  TestValidator.predicate(
    "favorite folder timestamps exist",
    typeof createdFolder.created_at === "string" &&
      typeof createdFolder.updated_at === "string",
  );

  // 3. Attempt duplicate favorite folder creation with same name, expect error
  await TestValidator.error(
    "duplicate favorite folder name forbidden",
    async () => {
      await api.functional.shoppingMallAiBackend.customer.favoriteFolders.createFavoriteFolder(
        connection,
        {
          body: {
            name: folderName, // Intentionally duplicate
            description: RandomGenerator.paragraph({
              sentences: 2,
              wordMin: 6,
              wordMax: 10,
            }),
          } satisfies IShoppingMallAiBackendFavoriteFolder.ICreate,
        },
      );
    },
  );
}
