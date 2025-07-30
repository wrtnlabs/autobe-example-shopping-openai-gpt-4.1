import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCategory";

/**
 * Test accessing a child category detail with a mismatched parent-child
 * relationship.
 *
 * This test ensures that attempting to access a child category under a parent
 * it does NOT belong to is handled correctly. It confirms that the system
 * enforces strict referential integrity in category hierarchies.
 *
 * Steps:
 *
 * 1. Create two different parent categories (parentA, parentB).
 * 2. Create a child category under only parentA.
 * 3. Attempt to retrieve the child category using parentB (where child does not
 *    belong).
 * 4. Assert that a not found or relationship error is thrown, proving the child
 *    cannot be accessed via the unrelated parent.
 */
export async function test_api_aimall_backend_seller_categories_childCategories_test_get_child_category_details_with_mismatched_parent_child_relation(
  connection: api.IConnection,
) {
  // 1. Create Parent A (root category)
  const parentA = await api.functional.aimall_backend.seller.categories.create(
    connection,
    {
      body: {
        name: RandomGenerator.alphabets(8),
        depth: 1,
        parent_id: null,
      } satisfies IAimallBackendCategory.ICreate,
    },
  );
  typia.assert(parentA);

  // 2. Create Parent B (a different root category)
  const parentB = await api.functional.aimall_backend.seller.categories.create(
    connection,
    {
      body: {
        name: RandomGenerator.alphabets(8),
        depth: 1,
        parent_id: null,
      } satisfies IAimallBackendCategory.ICreate,
    },
  );
  typia.assert(parentB);

  // 3. Create a child category under Parent A only
  const child =
    await api.functional.aimall_backend.seller.categories.childCategories.create(
      connection,
      {
        categoryId: parentA.id,
        body: {
          name: RandomGenerator.alphabets(10),
          depth: 2,
        } satisfies IAimallBackendCategory.ICreate,
      },
    );
  typia.assert(child);
  // Ensure correct parent linkage
  TestValidator.equals("child belongs to parentA")(child.parent_id)(parentA.id);
  TestValidator.notEquals("child not under parentB")(child.parent_id)(
    parentB.id,
  );

  // 4. Attempt to retrieve the child using Parent B as parent – expect not found or relationship error
  await TestValidator.error(
    "should return error when accessing child with unrelated parent",
  )(async () => {
    await api.functional.aimall_backend.seller.categories.childCategories.at(
      connection,
      {
        categoryId: parentB.id,
        childCategoryId: child.id,
      },
    );
  });
}
