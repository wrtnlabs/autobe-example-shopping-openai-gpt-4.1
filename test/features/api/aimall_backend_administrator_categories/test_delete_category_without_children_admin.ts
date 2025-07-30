import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCategory";

/**
 * Validate administrator deletion of a category with no children or associated
 * products.
 *
 * This test creates a top-level (root) category as a clean, unreferenced
 * taxonomy node, then deletes it using the administrator API. Afterward, it
 * validates that the category cannot be deleted again (ensuring permanent
 * removal from taxonomy), matching business rules for hard deletion. Audit log
 * check is skipped due to unavailable endpoint in provided API.
 *
 * Steps:
 *
 * 1. Create a root category with no parent and at depth 1 (ensures no children or
 *    products)
 * 2. Delete the just-created category
 * 3. Verify deletion by ensuring that a repeat delete results in error (404 or
 *    equivalent)
 */
export async function test_api_aimall_backend_administrator_categories_test_delete_category_without_children_admin(
  connection: api.IConnection,
) {
  // 1. Create a root category (no parent, depth 1)
  const category =
    await api.functional.aimall_backend.administrator.categories.create(
      connection,
      {
        body: {
          parent_id: null,
          name: "E2E_DELETE_EMPTY_CATEGORY_" + RandomGenerator.alphabets(8),
          depth: 1,
        } satisfies IAimallBackendCategory.ICreate,
      },
    );
  typia.assert(category);

  // 2. Delete the category by its ID
  await api.functional.aimall_backend.administrator.categories.erase(
    connection,
    {
      categoryId: category.id,
    },
  );

  // 3. Confirm category is deleted by ensuring second delete call fails
  await TestValidator.error("repeat delete returns not found")(() =>
    api.functional.aimall_backend.administrator.categories.erase(connection, {
      categoryId: category.id,
    }),
  );
}
