import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductCategory";

export async function test_api_product_category_update_uniqueness_violation(
  connection: api.IConnection,
) {
  /**
   * Test that updating a product category's name to that of another category in
   * the same channel is not allowed.
   *
   * 1. Register a new admin account for authentication context.
   * 2. Create product category A (with unique name/code, as a root category).
   * 3. Create product category B (with a different name/code, also as a root
   *    category).
   * 4. Attempt to update category B so its name matches A's (should fail due to
   *    uniqueness constraint).
   * 5. Validate that a business logic error occurs.
   */

  // 1. Register admin for authentication
  const adminUsername = RandomGenerator.alphaNumeric(8);
  const adminEmail = `${RandomGenerator.alphaNumeric(8)}@company.com`;
  const adminPasswordHash = RandomGenerator.alphaNumeric(32); // Simulated hashed password
  const adminJoinResult = await api.functional.auth.admin.join(connection, {
    body: {
      username: adminUsername,
      password_hash: adminPasswordHash,
      name: RandomGenerator.name(),
      email: adminEmail,
      is_active: true,
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });
  typia.assert(adminJoinResult);

  // 2. Create category A (root with unique name/code)
  const categoryAName = RandomGenerator.name(2);
  const categoryACode = RandomGenerator.alphaNumeric(6);
  const categoryA =
    await api.functional.shoppingMallAiBackend.admin.productCategories.create(
      connection,
      {
        body: {
          category_name: categoryAName,
          category_code: categoryACode,
          is_active: true,
          parent_id: null,
        } satisfies IShoppingMallAiBackendProductCategory.ICreate,
      },
    );
  typia.assert(categoryA);

  // 3. Create category B with different name/code, also as root
  const categoryBName = RandomGenerator.name(2);
  const categoryBCode = RandomGenerator.alphaNumeric(6);
  const categoryB =
    await api.functional.shoppingMallAiBackend.admin.productCategories.create(
      connection,
      {
        body: {
          category_name: categoryBName,
          category_code: categoryBCode,
          is_active: true,
          parent_id: null,
        } satisfies IShoppingMallAiBackendProductCategory.ICreate,
      },
    );
  typia.assert(categoryB);

  // 4. Attempt to update category B's name to match category A's (should error)
  await TestValidator.error(
    "category name uniqueness constraint is enforced when updating",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.productCategories.update(
        connection,
        {
          categoryId: categoryB.id,
          body: {
            category_name: categoryAName,
          } satisfies IShoppingMallAiBackendProductCategory.IUpdate,
        },
      );
    },
  );
}
