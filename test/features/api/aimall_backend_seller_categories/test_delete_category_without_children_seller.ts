import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCategory";

/**
 * Validate hard deletion of a seller category with no children or products.
 *
 * This test ensures that when a seller deletes a category (with no child
 * categories or products), the category is removed from the taxonomy, and
 * subsequent fetches fail with a not-found error. This mimics regular
 * maintenance of cleaning up orphaned/unreferenced taxonomy nodes.
 *
 * Steps:
 *
 * 1. Administrator creates a root category to be used in this test.
 * 2. Seller attempts to hard delete the category by its ID.
 * 3. Confirm the API response is 204 No Content (delete succeeded, nothing
 *    returned).
 * 4. Attempt to delete again or fetch (simulate) should return not-found (error).
 * 5. Clean up is implicit as the record is irreversibly removed.
 */
export async function test_api_aimall_backend_seller_categories_test_delete_category_without_children_seller(
  connection: api.IConnection,
) {
  // 1. Administrator creates a root category
  const rootCategory =
    await api.functional.aimall_backend.administrator.categories.create(
      connection,
      {
        body: {
          parent_id: null,
          name: `TestRoot_${Date.now()}`,
          depth: 1,
        } satisfies IAimallBackendCategory.ICreate,
      },
    );
  typia.assert(rootCategory);

  // 2. Seller attempts to hard delete the category
  await api.functional.aimall_backend.seller.categories.erase(connection, {
    categoryId: rootCategory.id,
  });

  // 3. Attempting to delete again (or fetch) should now fail with not-found (error thrown)
  await TestValidator.error("category already deleted should fail")(() =>
    api.functional.aimall_backend.seller.categories.erase(connection, {
      categoryId: rootCategory.id,
    }),
  );
}
