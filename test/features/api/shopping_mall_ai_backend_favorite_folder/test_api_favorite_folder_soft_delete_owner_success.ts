import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendFavoriteFolder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendFavoriteFolder";

/**
 * Test successful soft deletion (idempotent) of a favorite folder by its
 * owner (customer).
 *
 * Scenario:
 *
 * 1. Register a new customer (join), which authenticates the connection.
 * 2. Customer creates a favorite folder, which is validated for creation
 *    success.
 * 3. Customer invokes soft delete on the folder by its id.
 * 4. Verify no errors are thrown and that the operation is repeatable
 *    (idempotency).
 * 5. (Omitted: list/read verification of deletion, as appropriate API is not
 *    available.)
 *
 * Notes:
 *
 * - This test validates customer-protected ownership, successful folder
 *   creation, idempotent deletion, and correct use of authentication flow.
 * - Edge-case: repeated deletion should not throw or cause error (idempotency
 *   enforced).
 * - Only implementable verifications are included per available SDK; absence
 *   in list and deleted_at validation omitted.
 */
export async function test_api_favorite_folder_soft_delete_owner_success(
  connection: api.IConnection,
) {
  // 1. Register a new customer (join)
  const joinInput: IShoppingMallAiBackendCustomer.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    phone_number: RandomGenerator.mobile(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    nickname: RandomGenerator.name(1),
  };
  const joinResult = await api.functional.auth.customer.join(connection, {
    body: joinInput,
  });
  typia.assert(joinResult);
  TestValidator.predicate(
    "customer is active after join",
    joinResult.customer.is_active === true,
  );

  // 2. Create a new favorite folder for this customer
  const createInput: IShoppingMallAiBackendFavoriteFolder.ICreate = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
  };
  const folder =
    await api.functional.shoppingMallAiBackend.customer.favoriteFolders.createFavoriteFolder(
      connection,
      { body: createInput },
    );
  typia.assert(folder);
  TestValidator.predicate(
    "favorite folder was created - id is string",
    typeof folder.id === "string" && folder.id.length > 0,
  );
  TestValidator.equals(
    "favorite folder name matches input",
    folder.name,
    createInput.name,
  );
  if (createInput.description) {
    TestValidator.equals(
      "favorite folder description matches input",
      folder.description,
      createInput.description,
    );
  }

  // 3. Delete the favorite folder by its ID (soft delete)
  await api.functional.shoppingMallAiBackend.customer.favoriteFolders.erase(
    connection,
    { favoriteFolderId: folder.id },
  );
  // If an error is thrown, test will fail here.
  TestValidator.predicate(
    "erase (soft-delete) did not throw for valid folder",
    true,
  );

  // 4. Idempotent delete: perform delete again, this should also succeed
  await api.functional.shoppingMallAiBackend.customer.favoriteFolders.erase(
    connection,
    { favoriteFolderId: folder.id },
  );
  TestValidator.predicate(
    "erase (soft-delete) is idempotent -- second call did not throw",
    true,
  );
  // Note: read/list and deleted_at field validation omitted as endpoints not available.
}
