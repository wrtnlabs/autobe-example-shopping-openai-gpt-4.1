import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCategory";
import type { IPageIAimallBackendCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendCategory";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Verify advanced search and filter functionality for product categories as
 * used by sellers.
 *
 * This test validates the backend category search/filter endpoint supports
 * required features for seller-side UI, including:
 *
 * - Searching by partial name (case-insensitive substring match)
 * - Filtering by hierarchical depth (level)
 * - Filtering by parent category (parent_id)
 * - Pagination: respects page and limit
 * - Ensures only those categories are visible that seller is permitted to see (no
 *   system/hidden outside role)
 *
 * Steps:
 *
 * 1. Search with partial name filter and verify all results contain substring
 *    (case-insensitive)
 * 2. Search with a specific depth and verify all category depths in response match
 * 3. Use parent_id filter and check all results have that parent_id
 * 4. Test pagination (page, limit) and confirm pagination metadata and data length
 * 5. (Edge: If possible, try to retrieve system/hidden categories as a seller and
 *    verify they are excluded)
 *
 * Limitations: As only category search is testable, cannot confirm explicit
 * role-restricted content. Focus on input/output correctness and backend
 * filtration.
 */
export async function test_api_aimall_backend_test_advanced_search_product_categories_seller_success(
  connection: api.IConnection,
) {
  // 1. Search by partial name
  const partialName = "Elec";
  const partialNameResult =
    await api.functional.aimall_backend.seller.categories.search(connection, {
      body: { name: partialName },
    });
  typia.assert(partialNameResult);
  TestValidator.predicate("all category names contain search substring")(
    partialNameResult.data.every((cat) =>
      cat.name.toLowerCase().includes(partialName.toLowerCase()),
    ),
  );

  // 2. Search by depth
  const testDepth = 2;
  const depthResult =
    await api.functional.aimall_backend.seller.categories.search(connection, {
      body: { depth: testDepth },
    });
  typia.assert(depthResult);
  TestValidator.predicate("all categories have specified depth")(
    depthResult.data.every((cat) => cat.depth === testDepth),
  );

  // 3. Filter by parent_id (using one from previous result, if available)
  if (depthResult.data.length > 0 && depthResult.data[0].parent_id) {
    const testParentId = depthResult.data[0].parent_id;
    const parentResult =
      await api.functional.aimall_backend.seller.categories.search(connection, {
        body: { parent_id: testParentId },
      });
    typia.assert(parentResult);
    TestValidator.predicate("all categories have specified parent_id")(
      parentResult.data.every((cat) => cat.parent_id === testParentId),
    );
  }

  // 4. Pagination: test limit and page
  const limit = 2;
  const page = 2;
  const pagedResult =
    await api.functional.aimall_backend.seller.categories.search(connection, {
      body: { limit, page },
    });
  typia.assert(pagedResult);
  TestValidator.equals(
    "pagination: limit matches data length or available records",
  )(pagedResult.data.length)(
    Math.min(limit, pagedResult.pagination.records - (page - 1) * limit),
  );
  TestValidator.equals("pagination: metadata page matches")(
    pagedResult.pagination.current,
  )(page);
  TestValidator.equals("pagination: metadata limit matches")(
    pagedResult.pagination.limit,
  )(limit);
  // Optionally, could test that changing page returns a different slice than page 1
}
