import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCategory";
import type { IPageIAimallBackendCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendCategory";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * E2E test: Filtered and paginated child category retrieval by admin.
 *
 * This test validates the administrator's ability to perform a filtered and
 * paginated search for child categories beneath a given parent category. It
 * covers the business requirement that searching through a potentially large
 * category tree must return only those child categories that match given
 * criteria (e.g., name substring match, depth filter), honoring pagination
 * (limit/page).
 *
 * Steps:
 *
 * 1. Create a parent category (root), capturing its id.
 * 2. Create several child categories (with different names and depths) under the
 *    parent.
 * 3. Choose filter values: e.g., part of a common substring in some names; depth;
 *    pagination size.
 * 4. Call the PATCH search endpoint to fetch matching results with filters
 *    applied.
 * 5. Verify only correct, paginated child categories are returned, verify accuracy
 *    of pagination metadata.
 * 6. Check sorting order if applicable by default (by name ascending is assumed if
 *    not configurable).
 */
export async function test_api_aimall_backend_administrator_categories_childCategories_test_filter_and_paginate_child_categories_as_admin(
  connection: api.IConnection,
) {
  // 1. Create parent category (depth 1, no parent_id)
  const parentCategory =
    await api.functional.aimall_backend.administrator.categories.create(
      connection,
      {
        body: {
          parent_id: null,
          name: "TestParent",
          depth: 1,
        },
      },
    );
  typia.assert(parentCategory);

  // 2. Create diverse child categories for testing
  const childNames = [
    "AlphaOne",
    "AlphaTwo",
    "BetaStart",
    "Gamma",
    "AlphaThree",
  ];
  const childCategories: IAimallBackendCategory[] = [];
  for (const name of childNames) {
    const child =
      await api.functional.aimall_backend.administrator.categories.childCategories.create(
        connection,
        {
          categoryId: parentCategory.id,
          body: {
            parent_id: parentCategory.id,
            name,
            depth: 2,
          },
        },
      );
    typia.assert(child);
    childCategories.push(child);
  }

  // 3. Filter: partial name 'Alpha', depth 2, page 1, limit 2
  const filter = {
    name: "Alpha",
    depth: 2,
    page: 1,
    limit: 2,
  };
  const page1 =
    await api.functional.aimall_backend.administrator.categories.childCategories.search(
      connection,
      {
        categoryId: parentCategory.id,
        body: filter,
      },
    );
  typia.assert(page1);
  // Expect only child categories whose names contain 'Alpha'
  const expectedAlphas = childCategories.filter((cat) =>
    cat.name.includes("Alpha"),
  );
  TestValidator.equals("matching total count")(page1.pagination.records)(
    expectedAlphas.length,
  );
  TestValidator.predicate("page size matches")(
    page1.data.length <= filter.limit,
  );
  page1.data.forEach((cat) =>
    TestValidator.predicate("name contains Alpha")(cat.name.includes("Alpha")),
  );
  page1.data.forEach((cat) => TestValidator.equals("depth is 2")(cat.depth)(2));

  // 4. Fetch page 2 if needed
  if (expectedAlphas.length > filter.limit) {
    const page2 =
      await api.functional.aimall_backend.administrator.categories.childCategories.search(
        connection,
        {
          categoryId: parentCategory.id,
          body: { ...filter, page: 2 },
        },
      );
    typia.assert(page2);
    TestValidator.equals("matching total count")(page2.pagination.records)(
      expectedAlphas.length,
    );
    page2.data.forEach((cat) =>
      TestValidator.predicate("name contains Alpha")(
        cat.name.includes("Alpha"),
      ),
    );
    page2.data.forEach((cat) =>
      TestValidator.equals("depth is 2")(cat.depth)(2),
    );
  }
}
