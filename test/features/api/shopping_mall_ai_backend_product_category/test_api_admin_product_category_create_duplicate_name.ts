import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductCategory";

export async function test_api_admin_product_category_create_duplicate_name(
  connection: api.IConnection,
) {
  /**
   * E2E test for uniqueness enforcement on product category creation (admin
   * context).
   *
   * Scenario:
   *
   * 1. Registers a new admin via /auth/admin/join (establishes authorization).
   * 2. Creates a product category with a unique name and code.
   * 3. Attempts to create another category using the same name and code in the
   *    same channel.
   *
   *    - Expects a business validation error (uniqueness violation).
   *
   * This test ensures:
   *
   * - Admin authentication is required before category management.
   * - Backend properly enforces unique constraint on category names (and codes)
   *   at business logic level.
   * - API handles duplicates with explicit error.
   * - SDK correctly manages authentication token context automatically.
   */

  // 1. Register a new admin (authorization prerequisite)
  const password_hash: string = RandomGenerator.alphaNumeric(32);
  const adminUsername: string = RandomGenerator.alphaNumeric(10);
  const adminEmail: string = `${RandomGenerator.alphaNumeric(8)}@company.com`;
  const adminName: string = RandomGenerator.name();
  const adminAuthorized = await api.functional.auth.admin.join(connection, {
    body: {
      username: adminUsername,
      password_hash,
      name: adminName,
      email: adminEmail,
      is_active: true,
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });
  typia.assert(adminAuthorized);

  // 2. Create the first product category
  const duplicateName = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 5,
    wordMax: 10,
  });
  const duplicateCode = RandomGenerator.alphaNumeric(10);
  const createInput: IShoppingMallAiBackendProductCategory.ICreate = {
    category_name: duplicateName,
    category_code: duplicateCode,
    is_active: true,
    sort_order: 1,
    category_depth: 0,
    parent_id: null,
  };
  const createdCategory =
    await api.functional.shoppingMallAiBackend.admin.productCategories.create(
      connection,
      {
        body: createInput satisfies IShoppingMallAiBackendProductCategory.ICreate,
      },
    );
  typia.assert(createdCategory);
  TestValidator.equals(
    "created category name matches",
    createdCategory.category_name,
    duplicateName,
  );
  TestValidator.equals(
    "created category code matches",
    createdCategory.category_code,
    duplicateCode,
  );

  // 3. Attempt to create a duplicate category (same name & code), should error
  await TestValidator.error(
    "creating duplicate category with same name/code causes uniqueness error",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.productCategories.create(
        connection,
        {
          body: createInput satisfies IShoppingMallAiBackendProductCategory.ICreate,
        },
      );
    },
  );
}
