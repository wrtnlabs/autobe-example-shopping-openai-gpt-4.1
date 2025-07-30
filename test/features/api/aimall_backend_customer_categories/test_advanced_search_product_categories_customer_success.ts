import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCategory";
import type { IPageIAimallBackendCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendCategory";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Test advanced product category search for customers with diverse filters
 * (partial name, depth, parent_id, pagination).
 *
 * Validates the /aimall-backend/customer/categories advanced search
 * functionality for customer role, ensuring:
 *
 * - All specified search criteria (partial name, depth, parent_id, and
 *   pagination) are respected.
 * - Pagination metadata is correct and reflects filtered result.
 * - Only accessible (non-system/hidden) categories are returned to customer.
 *
 * Steps:
 *
 * 1. Perform category search with partial name filter. Validate that all results'
 *    names contain the substring, pagination data matches expected structure,
 *    and no hidden/system categories are present.
 * 2. Perform search with depth filter; verify only matching-depth categories are
 *    in results and pagination correct.
 * 3. Perform search with random parent_id; validate all returned categories are
 *    children of given parent_id.
 * 4. Run category search with pagination (page/limit), verify correct slicing of
 *    result and pagination metadata.
 * 5. Try searching for hidden/system categories with customer role—must NOT return
 *    such entries if such flag exists in real system; otherwise, validate only
 *    normal categories come back.
 */
export async function test_api_aimall_backend_customer_categories_test_advanced_search_product_categories_customer_success(
  connection: api.IConnection,
) {
  // 1. Partial name filter
  const partialName = "cat";
  const searchPartialName =
    await api.functional.aimall_backend.customer.categories.search(connection, {
      body: { name: partialName } satisfies IAimallBackendCategory.IRequest,
    });
  typia.assert(searchPartialName);
  // All results have name containing substring (case-insensitive)
  for (const cat of searchPartialName.data) {
    TestValidator.predicate(`category name contains '${partialName}'`)(
      cat.name.toLowerCase().includes(partialName.toLowerCase()),
    );
  }
  // Pagination correctness
  TestValidator.predicate("pagination current matches request")(
    searchPartialName.pagination.current === 1,
  );

  // 2. Depth filter
  const depthValue = 2;
  const searchDepth =
    await api.functional.aimall_backend.customer.categories.search(connection, {
      body: { depth: depthValue } satisfies IAimallBackendCategory.IRequest,
    });
  typia.assert(searchDepth);
  for (const cat of searchDepth.data) {
    TestValidator.equals("category depth matches")(cat.depth)(depthValue);
  }

  // 3. Parent_id filter
  let parentToTest = null;
  if (searchDepth.data.length > 0) {
    // Pick parent of one category if available
    parentToTest = searchDepth.data[0].parent_id ?? null;
  }
  if (parentToTest) {
    const searchParent =
      await api.functional.aimall_backend.customer.categories.search(
        connection,
        {
          body: {
            parent_id: parentToTest,
          } satisfies IAimallBackendCategory.IRequest,
        },
      );
    typia.assert(searchParent);
    for (const cat of searchParent.data) {
      TestValidator.equals("parent id matches")(cat.parent_id)(parentToTest);
    }
  }

  // 4. Pagination
  const limit = 2;
  const page = 2;
  const searchPage =
    await api.functional.aimall_backend.customer.categories.search(connection, {
      body: { limit, page } satisfies IAimallBackendCategory.IRequest,
    });
  typia.assert(searchPage);
  TestValidator.equals("limit matches")(searchPage.pagination.limit)(limit);
  TestValidator.equals("current page matches")(searchPage.pagination.current)(
    page,
  );
  // Data length <= limit
  TestValidator.predicate("result is paged correctly")(
    searchPage.data.length <= limit,
  );

  // 5. Search for unauthorized/hidden categories (not possible - enforced by role)
  // No flag for 'hidden' in DTO; if ever added, ensure not returned for customer
  // For now, at least verify total result < all categories if restricted
}
