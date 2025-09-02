import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductCategory";

/**
 * Test product category update with a non-existent parent_id.
 *
 * This test verifies that the backend enforces business rules: a product
 * category cannot be updated with a parent_id that does not correspond to
 * an existing category.
 *
 * 1. Register admin to obtain authentication.
 * 2. Create a root product category (to be updated).
 * 3. Attempt to update this category, setting its parent_id to a random UUID
 *    (non-existent category).
 * 4. Assert that the update fails with a validation or business logic error.
 */
export async function test_api_product_category_update_invalid_parent(
  connection: api.IConnection,
) {
  // 1. Register administrator
  const admin: IShoppingMallAiBackendAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(10),
        password_hash: RandomGenerator.alphaNumeric(32),
        name: RandomGenerator.name(),
        email: `${RandomGenerator.alphaNumeric(8)}@test.com`,
        is_active: true,
        phone_number: RandomGenerator.mobile(),
      } satisfies IShoppingMallAiBackendAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Create a legitimate root category
  const createdCategory: IShoppingMallAiBackendProductCategory =
    await api.functional.shoppingMallAiBackend.admin.productCategories.create(
      connection,
      {
        body: {
          category_name: RandomGenerator.name(3),
          category_code: RandomGenerator.alphaNumeric(8),
          parent_id: null,
          is_active: true,
          sort_order: 0,
          category_depth: 0,
        } satisfies IShoppingMallAiBackendProductCategory.ICreate,
      },
    );
  typia.assert(createdCategory);

  // 3. Attempt update with invalid parent_id
  const nonExistentParentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.error(
    "should fail updating category with non-existent parent_id",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.productCategories.update(
        connection,
        {
          categoryId: createdCategory.id,
          body: {
            parent_id: nonExistentParentId,
          } satisfies IShoppingMallAiBackendProductCategory.IUpdate,
        },
      );
    },
  );
}
