import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCategory";

/**
 * Validate that a seller can update the name of a child category under their
 * owned parent category, enforcing name uniqueness among siblings.
 *
 * Business context: Sellers need to be able to manage product taxonomy by
 * renaming child categories under parents they own. The update must not allow
 * duplicate names within the same parent (uniqueness is strictly enforced), and
 * hierarchy invariants (parent_id/depth) must not change via this API.
 *
 * Steps:
 *
 * 1. Create a parent category (root)
 * 2. Create first child category (childA) with a unique name
 * 3. Create a sibling child category (childB) with a different name
 * 4. Update childA's name to a new unique value (should succeed)
 * 5. Attempt to update childA's name to collide with childB's name (should fail)
 * 6. Verify all business invariants
 */
export async function test_api_aimall_backend_seller_categories_childCategories_update_name_uniqueness(
  connection: api.IConnection,
) {
  // 1. Create parent category as the root
  const parentName = RandomGenerator.alphaNumeric(10);
  const parent = await api.functional.aimall_backend.seller.categories.create(
    connection,
    {
      body: {
        parent_id: null,
        name: parentName,
        depth: 1,
      } satisfies IAimallBackendCategory.ICreate,
    },
  );
  typia.assert(parent);

  // 2. Create childA (first child) under parent
  const childAName = RandomGenerator.alphaNumeric(10);
  const childA =
    await api.functional.aimall_backend.seller.categories.childCategories.create(
      connection,
      {
        categoryId: parent.id,
        body: {
          parent_id: parent.id,
          name: childAName,
          depth: 2,
        } satisfies IAimallBackendCategory.ICreate,
      },
    );
  typia.assert(childA);

  // 3. Create childB (sibling of childA) under parent
  const childBName = RandomGenerator.alphaNumeric(10);
  const childB =
    await api.functional.aimall_backend.seller.categories.childCategories.create(
      connection,
      {
        categoryId: parent.id,
        body: {
          parent_id: parent.id,
          name: childBName,
          depth: 2,
        } satisfies IAimallBackendCategory.ICreate,
      },
    );
  typia.assert(childB);

  // 4. Update childA's name to a new valid unique value (should succeed)
  const newUniqueName = RandomGenerator.alphaNumeric(12);
  const updatedChildA =
    await api.functional.aimall_backend.seller.categories.childCategories.update(
      connection,
      {
        categoryId: parent.id,
        childCategoryId: childA.id,
        body: {
          name: newUniqueName,
        } satisfies IAimallBackendCategory.IUpdate,
      },
    );
  typia.assert(updatedChildA);
  TestValidator.equals("name updated")(updatedChildA.name)(newUniqueName);
  TestValidator.equals("parent_id remains")(updatedChildA.parent_id)(parent.id);
  TestValidator.equals("depth remains")(updatedChildA.depth)(childA.depth);

  // 5. Attempt to update childA's name to collide with childB's name (should fail)
  await TestValidator.error("duplicate child name")(async () => {
    await api.functional.aimall_backend.seller.categories.childCategories.update(
      connection,
      {
        categoryId: parent.id,
        childCategoryId: childA.id,
        body: {
          name: childBName,
        } satisfies IAimallBackendCategory.IUpdate,
      },
    );
  });
}
