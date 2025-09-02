import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendFavoriteFolder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendFavoriteFolder";

export async function test_api_favorite_folder_soft_delete_unauthorized_failure(
  connection: api.IConnection,
) {
  /**
   * Validates that a customer cannot soft-delete (logically remove) a favorite
   * folder not owned by them.
   *
   * Business scenario:
   *
   * 1. Register and authenticate Customer 1 (obtain token)
   * 2. Customer 1 creates a favorite folder
   * 3. Register and authenticate Customer 2 (obtains new token, context switches)
   * 4. Customer 2 attempts to delete Customer 1's favorite folder by ID
   * 5. Operation must fail with authorization error due to ownership enforcement
   *
   * This confirms that only the owning customer can delete their own favorite
   * folders and others are blocked.
   */
  // Step 1: Register Customer 1
  const customer1Email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const customer1Phone: string = RandomGenerator.mobile();
  const customer1Pwd: string & tags.Format<"password"> = "TestPassword1!";
  const customer1: IShoppingMallAiBackendCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customer1Email,
        phone_number: customer1Phone,
        password: customer1Pwd,
        name: RandomGenerator.name(),
        nickname: RandomGenerator.name(1),
      } satisfies IShoppingMallAiBackendCustomer.IJoin,
    });
  typia.assert(customer1);

  // Step 2: Customer 1 creates a favorite folder
  const favoriteFolder: IShoppingMallAiBackendFavoriteFolder =
    await api.functional.shoppingMallAiBackend.customer.favoriteFolders.createFavoriteFolder(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IShoppingMallAiBackendFavoriteFolder.ICreate,
      },
    );
  typia.assert(favoriteFolder);

  // Step 3: Register Customer 2 (context switches to Customer 2)
  const customer2Email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const customer2Phone: string = RandomGenerator.mobile();
  const customer2Pwd: string & tags.Format<"password"> = "TestPassword2!";
  const customer2: IShoppingMallAiBackendCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customer2Email,
        phone_number: customer2Phone,
        password: customer2Pwd,
        name: RandomGenerator.name(),
        nickname: RandomGenerator.name(1),
      } satisfies IShoppingMallAiBackendCustomer.IJoin,
    });
  typia.assert(customer2);

  // Step 4: Customer 2 attempts to delete Customer 1's favorite folder
  await TestValidator.error(
    "customer cannot soft-delete another customer's favorite folder",
    async () => {
      await api.functional.shoppingMallAiBackend.customer.favoriteFolders.erase(
        connection,
        {
          favoriteFolderId: favoriteFolder.id,
        },
      );
    },
  );
}
