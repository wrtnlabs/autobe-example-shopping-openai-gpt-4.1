import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductCategory";

/**
 * Test successful retrieval of product category details by admin.
 *
 * 1. Register an admin via /auth/admin/join.
 * 2. With the admin session, create a new product category using
 *    /shoppingMallAiBackend/admin/productCategories.
 * 3. Using the obtained categoryId, call GET
 *    /shoppingMallAiBackend/admin/productCategories/{categoryId} as the
 *    admin.
 * 4. Assert that the returned product category details (category_name,
 *    category_code, parent_id, category_depth, is_active, sort_order,
 *    created_at, updated_at, deleted_at) match the expected values from
 *    creation and system semantics.
 * 5. Validate audit fields (created_at, updated_at) have correct format and
 *    presence. Confirm admin session enables the detail query.
 */
export async function test_api_admin_product_category_detail_success(
  connection: api.IConnection,
) {
  // Step 1: Register an admin (for authentication context)
  const adminUsername = RandomGenerator.alphaNumeric(10);
  const adminEmail = `${RandomGenerator.alphaNumeric(8)}@e2e-admin.com`;
  const adminJoin: IShoppingMallAiBackendAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        username: adminUsername,
        password_hash: RandomGenerator.alphaNumeric(20),
        name: RandomGenerator.name(),
        email: adminEmail,
        is_active: true,
      } satisfies IShoppingMallAiBackendAdmin.ICreate,
    });
  typia.assert(adminJoin);
  // Step 2: Admin creates a new product category
  const categoryInput: IShoppingMallAiBackendProductCategory.ICreate = {
    category_name: RandomGenerator.name(3),
    category_code: RandomGenerator.alphaNumeric(6),
    // randomly test root/non-root: here root (parent_id=null)
    parent_id: null,
    sort_order: 1 + Math.floor(Math.random() * 100),
    is_active: true,
    category_depth: 0,
  };
  const newCategory =
    await api.functional.shoppingMallAiBackend.admin.productCategories.create(
      connection,
      { body: categoryInput },
    );
  typia.assert(newCategory);
  // Step 3: Retrieve product category details by id as admin
  const detail =
    await api.functional.shoppingMallAiBackend.admin.productCategories.at(
      connection,
      { categoryId: newCategory.id },
    );
  typia.assert(detail);
  // Step 4: Validate fields
  TestValidator.equals("category id matches", detail.id, newCategory.id);
  TestValidator.equals(
    "category name matches",
    detail.category_name,
    categoryInput.category_name,
  );
  TestValidator.equals(
    "category code matches",
    detail.category_code,
    categoryInput.category_code,
  );
  TestValidator.equals(
    "parent_id matches (null for root)",
    detail.parent_id,
    categoryInput.parent_id,
  );
  TestValidator.equals(
    "category depth matches",
    detail.category_depth,
    categoryInput.category_depth,
  );
  TestValidator.equals(
    "is_active matches",
    detail.is_active,
    categoryInput.is_active,
  );
  TestValidator.equals(
    "sort_order matches",
    detail.sort_order,
    categoryInput.sort_order,
  );
  TestValidator.predicate(
    "created_at is ISO",
    detail.created_at.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\./) !== null,
  );
  TestValidator.predicate(
    "updated_at is ISO",
    detail.updated_at.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\./) !== null,
  );
  TestValidator.equals(
    "deleted_at should be null for new category",
    detail.deleted_at,
    null,
  );
}
