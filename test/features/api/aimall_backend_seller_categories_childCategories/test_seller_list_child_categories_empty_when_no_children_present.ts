import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCategory";
import type { IPageIAimallBackendCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendCategory";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Test handling of fetching child categories for a parent with no children
 *
 * This test ensures that when fetching child categories for an existing parent
 * category that currently has no child categories, the API returns an empty
 * data array while the parent metadata (pagination, etc.) is returned properly.
 * This validates graceful handling in the absence of children, which is
 * required for stability and UI fallback mechanisms.
 *
 * Test Steps:
 *
 * 1. Create a new category as a parent (with parent_id null or omitted, and depth
 *    1).
 * 2. Immediately fetch its child categories via the GET endpoint using its id.
 * 3. Assert the API responds with an empty array for data.
 * 4. Validate returned pagination metadata is present and well-formed (current
 *    page, limit, records, pages).
 */
export async function test_api_aimall_backend_seller_categories_childCategories_test_seller_list_child_categories_empty_when_no_children_present(
  connection: api.IConnection,
) {
  // 1. Create a parent category with no children
  const parentCategory =
    await api.functional.aimall_backend.seller.categories.create(connection, {
      body: {
        name: RandomGenerator.alphaNumeric(12),
        depth: 1,
        parent_id: null,
      } satisfies IAimallBackendCategory.ICreate,
    });
  typia.assert(parentCategory);

  // 2. Fetch child categories for the parent (should be empty)
  const childCategories =
    await api.functional.aimall_backend.seller.categories.childCategories.index(
      connection,
      {
        categoryId: parentCategory.id,
      },
    );
  typia.assert(childCategories);

  // 3. Confirm that data array is empty
  TestValidator.equals("child category list should be empty")(
    childCategories.data,
  )([]);

  // 4. Confirm pagination metadata is valid
  TestValidator.equals("pagination current page")(
    childCategories.pagination.current,
  )(1);
  TestValidator.predicate("pagination limit should be a positive integer")(
    typeof childCategories.pagination.limit === "number" &&
      childCategories.pagination.limit > 0,
  );
  TestValidator.equals("pagination records")(
    childCategories.pagination.records,
  )(0);
  TestValidator.equals("pagination pages")(childCategories.pagination.pages)(1);
}
