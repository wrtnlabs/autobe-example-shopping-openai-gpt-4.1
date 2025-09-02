import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductCategory";

/**
 * Test successful update of a product category by admin.
 *
 * This E2E tests that an admin can update a product category (such as name,
 * sort_order) and that all changes are reflected as expected, with only
 * mutable fields changed and all business invariants preserved. The test
 * follows these business steps:
 *
 * 1. Register a new admin account and establish admin authentication.
 * 2. Create a product category to be used for update testing (with unique
 *    fields).
 * 3. Update the created category, changing one or more mutable fields.
 * 4. Verify the response for all business and contract invariants: updated
 *    fields reflect changes, unchanged fields stay the same, and updated_at
 *    is changed.
 *
 * Requests are authenticated strictly via the SDK, and type safety is
 * guaranteed with typia.assert throughout. TestValidator checks every
 * relevant business rule and contract property.
 */
export async function test_api_product_category_update_success(
  connection: api.IConnection,
) {
  // 1. Register a new admin account (establish authentication context via SDK)
  const adminUsername: string = RandomGenerator.alphaNumeric(12);
  const adminEmail: string = `${adminUsername}@test.com`;
  const adminPasswordHash: string = RandomGenerator.alphaNumeric(32);
  const admin: IShoppingMallAiBackendAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        username: adminUsername,
        password_hash: adminPasswordHash,
        name: RandomGenerator.name(),
        email: adminEmail,
        is_active: true,
      } satisfies IShoppingMallAiBackendAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Create a product category
  const initialCategoryName: string = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 10,
  });
  const initialCategoryCode: string = RandomGenerator.alphaNumeric(8);
  const productCategory: IShoppingMallAiBackendProductCategory =
    await api.functional.shoppingMallAiBackend.admin.productCategories.create(
      connection,
      {
        body: {
          category_name: initialCategoryName,
          category_code: initialCategoryCode,
          is_active: true,
          sort_order: 1,
        } satisfies IShoppingMallAiBackendProductCategory.ICreate,
      },
    );
  typia.assert(productCategory);

  // 3. Update the category (change category_name and sort_order)
  const updatedCategoryName: string = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 10,
  });
  const updatedSortOrder: number = 2;
  const updatedCategory: IShoppingMallAiBackendProductCategory =
    await api.functional.shoppingMallAiBackend.admin.productCategories.update(
      connection,
      {
        categoryId: productCategory.id,
        body: {
          category_name: updatedCategoryName,
          sort_order: updatedSortOrder,
        } satisfies IShoppingMallAiBackendProductCategory.IUpdate,
      },
    );
  typia.assert(updatedCategory);

  // 4. Validate the result: field-by-field checks
  TestValidator.equals(
    "id remains unchanged after update",
    updatedCategory.id,
    productCategory.id,
  );
  TestValidator.notEquals(
    "category_name updated",
    updatedCategory.category_name,
    productCategory.category_name,
  );
  TestValidator.equals(
    "updated category_name",
    updatedCategory.category_name,
    updatedCategoryName,
  );
  TestValidator.notEquals(
    "sort_order updated",
    updatedCategory.sort_order,
    productCategory.sort_order,
  );
  TestValidator.equals(
    "updated sort_order",
    updatedCategory.sort_order,
    updatedSortOrder,
  );
  TestValidator.notEquals(
    "updated_at has changed",
    updatedCategory.updated_at,
    productCategory.updated_at,
  );
  TestValidator.equals(
    "created_at remains unchanged",
    updatedCategory.created_at,
    productCategory.created_at,
  );
  TestValidator.equals(
    "category_code remains unchanged",
    updatedCategory.category_code,
    productCategory.category_code,
  );
  TestValidator.equals(
    "category_depth remains unchanged",
    updatedCategory.category_depth,
    productCategory.category_depth,
  );
  TestValidator.equals(
    "is_active remains unchanged",
    updatedCategory.is_active,
    productCategory.is_active,
  );
}
