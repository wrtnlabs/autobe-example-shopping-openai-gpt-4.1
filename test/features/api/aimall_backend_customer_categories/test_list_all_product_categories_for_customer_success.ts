import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPageIAimallBackendCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendCategory";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAimallBackendCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCategory";

/**
 * Test that a customer (logged-in or guest) can retrieve all product taxonomy
 * categories in normalized format.
 *
 * This test ensures the GET /aimall-backend/customer/categories API returns a
 * strictly normalized, complete list of product categories:
 *
 * - Each record is an IAimallBackendCategory with only valid fields (id,
 *   parent_id, name, depth)
 * - Hierarchy (parent_id, depth) and naming is consistent
 * - The response contains no extraneous (denormalized) fields
 * - Only active (non-deleted) categories are included (if system supports such
 *   filtering)
 * - Pagination metadata is present and valid
 *
 * 1. Request full category list as guest (unauthenticated customer context)
 * 2. Validate pagination meta (current, limit, records, pages)
 * 3. Validate each category object for presence and correctness of all normalized
 *    fields
 * 4. Assert every IAimallBackendCategory has only id, parent_id, name, and depth
 *    (no extras)
 * 5. Confirm all id and parent_id values (when present) are valid UUIDs; depth >=
 *    1; name is non-empty string
 * 6. (Optionally) Test could be extended in future to repeat for authenticated
 *    customer context
 */
export async function test_api_aimall_backend_customer_categories_index(
  connection: api.IConnection,
) {
  // 1. Call the API to retrieve categories as guest
  const page =
    await api.functional.aimall_backend.customer.categories.index(connection);
  typia.assert(page);

  // 2. Validate pagination meta fields
  TestValidator.predicate("pagination current page > 0")(
    page.pagination.current > 0,
  );
  TestValidator.predicate("pagination limit > 0")(page.pagination.limit > 0);
  TestValidator.predicate("pagination records >= data.length")(
    page.pagination.records >= page.data.length,
  );
  TestValidator.predicate("pagination pages >= 1")(page.pagination.pages >= 1);

  // 3. For each category, validate the data shape and normalization
  for (const cat of page.data) {
    // id field: string, UUID format
    TestValidator.predicate("category id is uuid")(
      typeof cat.id === "string" && /^[0-9a-fA-F-]{36}$/.test(cat.id),
    );
    // name: non-empty string
    TestValidator.equals("category name not empty")(
      typeof cat.name === "string" && cat.name.length > 0,
    )(true);
    // depth: int32, >= 1
    TestValidator.predicate("category depth >= 1")(cat.depth >= 1);
    // parent_id: uuid or null/undefined
    if (cat.parent_id !== undefined && cat.parent_id !== null) {
      TestValidator.predicate("parent_id is uuid")(
        typeof cat.parent_id === "string" &&
          /^[0-9a-fA-F-]{36}$/.test(cat.parent_id),
      );
    }
    // No extraneous fields (only id, parent_id, name, depth)
    const expected = ["depth", "id", "name", "parent_id"].sort();
    const actual = Object.keys(cat).sort();
    TestValidator.equals("category fields are normalized")(actual)(expected);
  }
}
