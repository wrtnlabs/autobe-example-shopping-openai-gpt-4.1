import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCategory";
import type { IPageIAimallBackendCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendCategory";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validate searching for child categories under a given parent category using a
 * filter that does not match any existing child.
 *
 * This test ensures the search/filter API for child categories behaves
 * correctly when the filter criteria produce no results. It verifies that:
 *
 * - A parent category exists in the system (setup step)
 * - The child category search API is called with a filter (by name) that cannot
 *   possibly match any created children
 * - The API responds with an empty data array (no matching children) and correct
 *   pagination metadata
 * - No errors occur and the response has the correct structure
 *
 * Steps:
 *
 * 1. Create a parent category
 * 2. Call the child category search API for this parent with a clearly impossible
 *    filter (e.g., a random string as 'name')
 * 3. Assert the returned data array is empty, and pagination metadata exists and
 *    is consistent (records=0, pages=0, current=1)
 */
export async function test_api_aimall_backend_administrator_categories_childCategories_test_filter_child_categories_with_no_matching_result(
  connection: api.IConnection,
) {
  // 1. Create a parent category
  const parentCategory =
    await api.functional.aimall_backend.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(15),
          depth: 1,
        } satisfies IAimallBackendCategory.ICreate,
      },
    );
  typia.assert(parentCategory);

  // 2. Search for child categories with an impossible filter (expect empty result)
  const impossibleName = RandomGenerator.alphaNumeric(24);
  const result =
    await api.functional.aimall_backend.administrator.categories.childCategories.search(
      connection,
      {
        categoryId: parentCategory.id,
        body: {
          name: impossibleName,
          parent_id: parentCategory.id,
          page: 1,
          limit: 10,
        } satisfies IAimallBackendCategory.IRequest,
      },
    );
  typia.assert(result);

  // 3. Assert that data is empty and pagination makes sense
  TestValidator.equals("no child categories found")(result.data.length)(0);
  TestValidator.equals("pagination records")(result.pagination.records)(0);
  TestValidator.equals("pagination pages")(result.pagination.pages)(0);
  TestValidator.equals("pagination current")(result.pagination.current)(1);
}
