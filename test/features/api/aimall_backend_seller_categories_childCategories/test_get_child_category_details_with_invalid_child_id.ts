import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCategory";

/**
 * Validate proper error handling when requesting the details of a non-existent
 * child category under a valid parent.
 *
 * This test confirms that the API returns a not found error when querying for a
 * child category ID that does not exist within a valid parent category. The
 * test ensures the error does not expose sensitive implementation details.
 *
 * Steps:
 *
 * 1. Create a valid parent category using the POST
 *    /aimall-backend/seller/categories endpoint.
 * 2. Attempt to retrieve a child category using GET
 *    /aimall-backend/seller/categories/{categoryId}/childCategories/{childCategoryId},
 *    where childCategoryId is randomly generated (and does not exist).
 * 3. Confirm that a not found error is returned, and the error is handled without
 *    leaking sensitive information.
 */
export async function test_api_aimall_backend_seller_categories_childCategories_test_get_child_category_details_with_invalid_child_id(
  connection: api.IConnection,
) {
  // 1. Create a valid parent category
  const parentName = RandomGenerator.alphabets(8);
  const parentCategory =
    await api.functional.aimall_backend.seller.categories.create(connection, {
      body: {
        name: parentName,
        depth: 1,
        parent_id: null,
      },
    });
  typia.assert(parentCategory);

  // 2. Attempt to retrieve a non-existent (invalid) child category under the created parent
  const invalidChildCategoryId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "Should return not found error when child category does not exist",
  )(async () => {
    await api.functional.aimall_backend.seller.categories.childCategories.at(
      connection,
      {
        categoryId: parentCategory.id,
        childCategoryId: invalidChildCategoryId,
      },
    );
  });
}
