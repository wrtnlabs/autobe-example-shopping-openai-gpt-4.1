import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCategory";

/**
 * Validate creation of a new child category immediately under an existing
 * parent category.
 *
 * This test simulates the full workflow for subcategory creation:
 *
 * 1. Creates a root parent category (depth=1)
 * 2. Creates a unique child category under this parent (depth=2), checks
 *    schema/fields/logic
 * 3. Creates another unique sibling child
 * 4. Attempts duplicate sibling name to verify business constraint on uniqueness
 *
 * Steps:
 *
 * 1. Create a root category to serve as parent (depth=1, null parent_id)
 * 2. Create child category: unique name under parent, depth=2
 *
 *    - Assert parent_id, depth, and name fields correctness
 * 3. Create another child with a different name to confirm sibling name uniqueness
 * 4. Attempt duplicate child name with same parent, verify error/constraint is
 *    enforced
 *
 * Note:
 *
 * - Role authentication (admin/seller) is assumed covered by test
 *   framework/context, as auth SDK is not provided here.
 * - All API and DTO use are within supplied schema/types
 * - This does not directly test audit logging, which is assumed handled by
 *   backend
 */
export async function test_api_aimall_backend_administrator_categories_childCategories_test_create_child_category_under_existing_parent_with_valid_data(
  connection: api.IConnection,
) {
  // 1. Create a root parent category (depth=1, no parent_id)
  const parentName: string = RandomGenerator.alphabets(12);
  const parentCategory: IAimallBackendCategory =
    await api.functional.aimall_backend.administrator.categories.create(
      connection,
      {
        body: {
          name: parentName,
          depth: 1,
          parent_id: null,
        } satisfies IAimallBackendCategory.ICreate,
      },
    );
  typia.assert(parentCategory);
  TestValidator.equals("root parent depth")(parentCategory.depth)(1);
  TestValidator.equals("parent name persisted")(parentCategory.name)(
    parentName,
  );
  TestValidator.equals("parent is root")(parentCategory.parent_id)(null);

  // 2. Create first child category under parent
  const childName: string = RandomGenerator.alphabets(10);
  const childCategory: IAimallBackendCategory =
    await api.functional.aimall_backend.administrator.categories.childCategories.create(
      connection,
      {
        categoryId: parentCategory.id,
        body: {
          name: childName,
          depth: parentCategory.depth + 1,
          // parent_id omitted: set by API path param logic
        } satisfies IAimallBackendCategory.ICreate,
      },
    );
  typia.assert(childCategory);
  TestValidator.equals("child parent_id set")(childCategory.parent_id)(
    parentCategory.id,
  );
  TestValidator.equals("child depth is parent+1")(childCategory.depth)(
    parentCategory.depth + 1,
  );
  TestValidator.equals("child name")(childCategory.name)(childName);

  // 3. Create another unique sibling under same parent
  const siblingName: string = RandomGenerator.alphabets(14);
  const siblingCategory: IAimallBackendCategory =
    await api.functional.aimall_backend.administrator.categories.childCategories.create(
      connection,
      {
        categoryId: parentCategory.id,
        body: {
          name: siblingName,
          depth: parentCategory.depth + 1,
        } satisfies IAimallBackendCategory.ICreate,
      },
    );
  typia.assert(siblingCategory);
  TestValidator.equals("sibling parent_id")(siblingCategory.parent_id)(
    parentCategory.id,
  );
  TestValidator.equals("sibling depth")(siblingCategory.depth)(
    parentCategory.depth + 1,
  );
  TestValidator.notEquals("sibling name unique")(siblingCategory.name)(
    childName,
  );

  // 4. Verify duplicate sibling name triggers business constraint (should error)
  await TestValidator.error("duplicate sibling name")(async () => {
    await api.functional.aimall_backend.administrator.categories.childCategories.create(
      connection,
      {
        categoryId: parentCategory.id,
        body: {
          name: childName,
          depth: parentCategory.depth + 1,
        } satisfies IAimallBackendCategory.ICreate,
      },
    );
  });
}
