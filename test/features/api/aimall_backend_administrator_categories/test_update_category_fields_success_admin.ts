import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCategory";

/**
 * E2E test for updating multiple fields (name, parent_id, depth) of an existing
 * category record by an administrator.
 *
 * This ensures the update endpoint allows an admin to manage all aspects of
 * category records in the taxonomy:
 *
 * - Can change the name
 * - Can assign a parent (change parent_id)
 * - Can change the depth
 *
 * It also confirms that results are persisted and reflected in the returned
 * record.
 *
 * Steps:
 *
 * 1. Create a root (top-level) category (depth = 1).
 * 2. Create a subcategory (child of the first, depth = 2).
 * 3. Update the subcategory: change its name, move it to be a root (parent_id:
 *    null, depth: 1).
 * 4. Confirm the updated fields in the response.
 */
export async function test_api_aimall_backend_administrator_categories_test_update_category_fields_success_admin(
  connection: api.IConnection,
) {
  // 1. Create root category
  const rootCategory =
    await api.functional.aimall_backend.administrator.categories.create(
      connection,
      {
        body: {
          name: `Root Category ${RandomGenerator.alphaNumeric(8)}`,
          parent_id: null,
          depth: 1,
        } satisfies IAimallBackendCategory.ICreate,
      },
    );
  typia.assert(rootCategory);

  // 2. Create subcategory
  const subCategory =
    await api.functional.aimall_backend.administrator.categories.create(
      connection,
      {
        body: {
          name: `Subcategory ${RandomGenerator.alphaNumeric(8)}`,
          parent_id: rootCategory.id,
          depth: 2,
        } satisfies IAimallBackendCategory.ICreate,
      },
    );
  typia.assert(subCategory);

  // 3. Update subcategory name, move to root (parent null, depth 1)
  const updatedName = `Updated Name ${RandomGenerator.alphaNumeric(8)}`;
  const updatedSubCategory =
    await api.functional.aimall_backend.administrator.categories.update(
      connection,
      {
        categoryId: subCategory.id,
        body: {
          name: updatedName,
          parent_id: null,
          depth: 1,
        } satisfies IAimallBackendCategory.IUpdate,
      },
    );
  typia.assert(updatedSubCategory);

  // 4. Confirm returned fields reflect the update
  TestValidator.equals("id unchanged")(updatedSubCategory.id)(subCategory.id);
  TestValidator.equals("name updated")(updatedSubCategory.name)(updatedName);
  TestValidator.equals("parent_id is now null")(updatedSubCategory.parent_id)(
    null,
  );
  TestValidator.equals("depth is 1")(updatedSubCategory.depth)(1);
}
