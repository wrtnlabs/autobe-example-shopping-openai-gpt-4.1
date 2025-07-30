import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCategory";
import type { IPageIAimallBackendCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendCategory";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validate advanced filtering and pagination of child categories as a seller.
 *
 * This test verifies that a seller can retrieve child categories of a given
 * parent, applying multiple filters (such as partial name match, depth
 * filtering) and correct pagination controls.
 *
 * Steps:
 *
 * 1. Create a parent category (root or random name, depth 1).
 * 2. Create multiple child categories (at least 5) under this parent, with varied
 *    names and depths (e.g., 2 and perhaps 3), ensuring some names share a
 *    common prefix for partial matching.
 * 3. Search child categories (PATCH) for this parent: a. With a partial name
 *    filter (should retrieve only matching categories among children)
 *
 *    - Validate all results: parent_id is parent, name contains partial query, depth
 *         as expected. b. With depth filter: should retrieve only those
 *         children of the specified depth c. With pagination: limit=2, page=2,
 *         check the correct number of records and correct page info d. No
 *         filter: retrieve all, verify all children present
 * 4. All results must never include categories from other parents, only direct
 *    children.
 * 5. Validate returned pagination metadata: correct total records, pages, per-page
 *    limits, etc.
 */
export async function test_api_aimall_backend_test_advanced_search_child_categories_for_seller(
  connection: api.IConnection,
) {
  // 1. Create a parent category
  const parentCategory =
    await api.functional.aimall_backend.seller.categories.create(connection, {
      body: {
        name: `ParentCat-${RandomGenerator.alphabets(6)}`,
        depth: 1,
      } satisfies IAimallBackendCategory.ICreate,
    });
  typia.assert(parentCategory);

  // 2. Create multiple child categories under parent
  const childNames = [
    "Alpha-Root", // for partial match 'Alpha'
    "Alpha-Leaf", // for partial match 'Alpha'
    "Beta-Root",
    "Gamma-Leaf",
    "Alpha-Branch",
  ];
  const childCategories = [];
  for (const name of childNames) {
    const category =
      await api.functional.aimall_backend.seller.categories.childCategories.create(
        connection,
        {
          categoryId: parentCategory.id,
          body: {
            parent_id: parentCategory.id,
            name,
            depth: 2,
          } satisfies IAimallBackendCategory.ICreate,
        },
      );
    typia.assert(category);
    childCategories.push(category);
  }

  // 3a. Search: partial name match 'Alpha'
  const alphaRes =
    await api.functional.aimall_backend.seller.categories.childCategories.search(
      connection,
      {
        categoryId: parentCategory.id,
        body: { name: "Alpha" } satisfies IAimallBackendCategory.IRequest,
      },
    );
  typia.assert(alphaRes);
  TestValidator.predicate("all results contain 'Alpha' in name")(
    alphaRes.data.every(
      (c) => c.name.includes("Alpha") && c.parent_id === parentCategory.id,
    ),
  );

  // 3b. Search: depth filter (2)
  const depthRes =
    await api.functional.aimall_backend.seller.categories.childCategories.search(
      connection,
      {
        categoryId: parentCategory.id,
        body: { depth: 2 } satisfies IAimallBackendCategory.IRequest,
      },
    );
  typia.assert(depthRes);
  TestValidator.predicate("all results have depth 2 and correct parent")(
    depthRes.data.every(
      (c) => c.depth === 2 && c.parent_id === parentCategory.id,
    ),
  );

  // 3c. Search: pagination limit=2, page=2
  const pagedRes =
    await api.functional.aimall_backend.seller.categories.childCategories.search(
      connection,
      {
        categoryId: parentCategory.id,
        body: { limit: 2, page: 2 } satisfies IAimallBackendCategory.IRequest,
      },
    );
  typia.assert(pagedRes);
  TestValidator.equals("limit equals 2")(pagedRes.pagination.limit)(2);
  TestValidator.equals("current page equals 2")(pagedRes.pagination.current)(2);
  TestValidator.predicate("records per page <= 2")(pagedRes.data.length <= 2);
  TestValidator.predicate("all belong to parent")(
    pagedRes.data.every((c) => c.parent_id === parentCategory.id),
  );

  // 3d. Search: no filters, return all
  const allRes =
    await api.functional.aimall_backend.seller.categories.childCategories.search(
      connection,
      {
        categoryId: parentCategory.id,
        body: {} satisfies IAimallBackendCategory.IRequest,
      },
    );
  typia.assert(allRes);
  TestValidator.equals("all child categories present")(
    allRes.pagination.records,
  )(childCategories.length);
  TestValidator.predicate("all returned belong to parent")(
    allRes.data.every((c) => c.parent_id === parentCategory.id),
  );
}
