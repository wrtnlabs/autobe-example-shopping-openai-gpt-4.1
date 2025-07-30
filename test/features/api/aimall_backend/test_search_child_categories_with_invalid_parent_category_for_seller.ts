import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCategory";
import type { IPageIAimallBackendCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendCategory";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validate error handling when searching for child categories with an invalid
 * or unauthorized parent category as a seller.
 *
 * This test ensures that the API appropriately returns an error (such as 404
 * Not Found or 403 Forbidden) when a seller attempts to search for child
 * categories using:
 *
 * - A non-existent (random) categoryId
 * - A validly formatted but unauthorized categoryId (if relevant and possible)
 *
 * Steps:
 *
 * 1. Generate a random UUID (categoryId) that does not correspond to any existing
 *    category.
 * 2. Attempt to search for child categories under this invalid categoryId using
 *    the seller-scoped API endpoint, passing minimal valid filter/pagination
 *    data ([]/empty body).
 * 3. Assert that the server responds with an error (expected: HttpError,
 *    specifically 404 or 403 forbidden).
 *
 * Note: This test focuses only on runtime business/API errors resulting from
 * the test scenario, not on compile-time type or schema errors.
 */
export async function test_api_aimall_backend_test_search_child_categories_with_invalid_parent_category_for_seller(
  connection: api.IConnection,
) {
  // 1. Generate a random UUID to simulate a non-existent categoryId
  const nonExistentCategoryId = typia.random<string & tags.Format<"uuid">>();

  // 2. Attempt to search for child categories with this invalid categoryId
  await TestValidator.error(
    "Searching with non-existent or unauthorized categoryId should fail",
  )(async () => {
    await api.functional.aimall_backend.seller.categories.childCategories.search(
      connection,
      {
        categoryId: nonExistentCategoryId,
        body: {} satisfies IAimallBackendCategory.IRequest,
      },
    );
  });
}
