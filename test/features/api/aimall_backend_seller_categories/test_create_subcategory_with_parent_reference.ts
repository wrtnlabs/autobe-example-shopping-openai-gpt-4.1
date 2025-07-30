import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCategory";

/**
 * Test creation of a subcategory referencing an existing parent category under
 * a seller account.
 *
 * This test covers the following business workflow:
 *
 * 1. Create a root category (no parent_id, depth = 1) as a seller. This sets up
 *    the test's category hierarchy root node.
 * 2. Create a subcategory with the root category's id as parent_id and depth = 2;
 *    verify response parent/child linkage and depth increase.
 * 3. Edge case: Attempt to create a subcategory for a parent at max allowed depth
 *    (e.g., parent at depth = 3) and verify rejection (system supports
 *    typically three levels, so subcategories of level-3 should not be
 *    allowed).
 * 4. Edge case: Attempt to create a subcategory with an invalid/nonexistent
 *    parent_id (random UUID). Confirm API returns correct hierarchy violation
 *    error or 422.
 *
 * Validates hierarchical linkage, depth correctness, and proper enforcement of
 * category tree rules including maximal allowable nesting and orphan
 * references.
 */
export async function test_api_aimall_backend_seller_categories_test_create_subcategory_with_parent_reference(
  connection: api.IConnection,
) {
  // 1. Create a root category
  const rootCategory =
    await api.functional.aimall_backend.seller.categories.create(connection, {
      body: {
        parent_id: null,
        name: RandomGenerator.alphabets(8),
        depth: 1,
      } satisfies IAimallBackendCategory.ICreate,
    });
  typia.assert(rootCategory);
  TestValidator.equals("root category depth")(rootCategory.depth)(1);
  TestValidator.equals("root category parent_id")(rootCategory.parent_id)(null);

  // 2. Create a subcategory with root category as parent
  const subCategory =
    await api.functional.aimall_backend.seller.categories.create(connection, {
      body: {
        parent_id: rootCategory.id,
        name: RandomGenerator.alphabets(10),
        depth: 2,
      } satisfies IAimallBackendCategory.ICreate,
    });
  typia.assert(subCategory);
  TestValidator.equals("subcategory parent linkage")(subCategory.parent_id)(
    rootCategory.id,
  );
  TestValidator.equals("subcategory depth")(subCategory.depth)(2);

  // 3. Attempt to create with parent at max depth (simulate parent at depth 3)
  const maxDepthCategory =
    await api.functional.aimall_backend.seller.categories.create(connection, {
      body: {
        parent_id: subCategory.id,
        name: RandomGenerator.alphabets(12),
        depth: 3,
      } satisfies IAimallBackendCategory.ICreate,
    });
  typia.assert(maxDepthCategory);
  TestValidator.equals("max depth category linkage")(
    maxDepthCategory.parent_id,
  )(subCategory.id);
  TestValidator.equals("max depth category depth")(maxDepthCategory.depth)(3);

  await TestValidator.error("cannot create subcategory beyond max depth")(
    async () => {
      await api.functional.aimall_backend.seller.categories.create(connection, {
        body: {
          parent_id: maxDepthCategory.id,
          name: RandomGenerator.alphabets(6),
          depth: 4,
        } satisfies IAimallBackendCategory.ICreate,
      });
    },
  );

  // 4. Attempt to create subcategory with invalid parent_id (random UUID)
  await TestValidator.error("invalid parent reference should fail")(
    async () => {
      await api.functional.aimall_backend.seller.categories.create(connection, {
        body: {
          parent_id: typia.random<string & tags.Format<"uuid">>(),
          name: RandomGenerator.alphabets(5),
          depth: 2,
        } satisfies IAimallBackendCategory.ICreate,
      });
    },
  );
}
