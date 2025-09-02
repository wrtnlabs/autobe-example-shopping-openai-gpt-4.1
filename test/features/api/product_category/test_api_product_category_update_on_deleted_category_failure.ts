import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductCategory";

export async function test_api_product_category_update_on_deleted_category_failure(
  connection: api.IConnection,
) {
  /**
   * Validate that updating a soft-deleted product category fails as expected.
   *
   * Business context: Admins manage category hierarchies. Soft-deleted
   * categories should not be editable to prevent accidental resurrection or
   * logical inconsistencies. The backend must enforce that any update API call
   * against a soft-deleted category returns a not-found or deleted error
   * (business logic error).
   *
   * Workflow:
   *
   * 1. Register a new admin and obtain authentication.
   * 2. Create a product category and save its UUID.
   * 3. Soft-delete (erase) the category via the erase API.
   * 4. Attempt to update the soft-deleted category using the update API.
   * 5. Assert that the update operation fails and the category remains
   *    unmodifiable.
   */

  // 1. Register a new admin and authenticate
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(12),
      password_hash: RandomGenerator.alphaNumeric(32),
      name: RandomGenerator.name(),
      email: `admin+${RandomGenerator.alphaNumeric(6)}@domain.com`,
      is_active: true,
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });
  typia.assert(adminJoin);

  // 2. Create a new product category
  const category =
    await api.functional.shoppingMallAiBackend.admin.productCategories.create(
      connection,
      {
        body: {
          category_name: RandomGenerator.name(3),
          category_code: RandomGenerator.alphaNumeric(8),
          parent_id: null,
          sort_order: 0,
          is_active: true,
          category_depth: 0,
        } satisfies IShoppingMallAiBackendProductCategory.ICreate,
      },
    );
  typia.assert(category);

  // 3. Soft-delete (erase) the category
  await api.functional.shoppingMallAiBackend.admin.productCategories.erase(
    connection,
    {
      categoryId: category.id,
    },
  );

  // 4. Attempt to update soft-deleted category; should error
  await TestValidator.error(
    "update of deleted category must fail",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.productCategories.update(
        connection,
        {
          categoryId: category.id,
          body: {
            category_name: RandomGenerator.name(2),
          } satisfies IShoppingMallAiBackendProductCategory.IUpdate,
        },
      );
    },
  );
}
