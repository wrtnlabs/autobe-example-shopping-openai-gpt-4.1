import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPageIAimallBackendCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendCategory";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAimallBackendCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCategory";

/**
 * Validate that a seller (authenticated user) can retrieve the complete list of
 * product taxonomy categories for catalog management, ensuring correct
 * parent/child hierarchy and all required fields.
 *
 * - Ensures that the category tree structure, including parent_id and depth, is
 *   intact per IAimallBackendCategory schema.
 * - Confirms that the response includes all expected properties and that the
 *   hierarchy is logically consistent.
 * - Checks that at least one top-level (root) category is returned
 *   (parent_id=null, depth=1) and that subcategories reference their valid
 *   parent_id.
 * - Verifies typical listing expectations for seller role (potentially more
 *   system categories than customer role).
 *
 * Steps:
 *
 * 1. Assume connection is authenticated as a seller.
 * 2. Call the seller categories API (GET /aimall-backend/seller/categories).
 * 3. Validate that the response is a list of categories, follows the
 *    IAimallBackendCategory schema, and includes valid hierarchy
 *    (parent_id/depth).
 * 4. Validate that at least one category is present and at least one is a root
 *    category.
 * 5. Check that every subcategory parent_id matches an existing category in the
 *    response data or is null for root entries.
 */
export async function test_api_aimall_backend_seller_categories_index(
  connection: api.IConnection,
) {
  // 1. Call seller categories API as an authenticated seller
  const output =
    await api.functional.aimall_backend.seller.categories.index(connection);
  typia.assert(output);

  // 2. Validate that at least one category is present
  TestValidator.predicate("at least one category exists")(
    output.data.length > 0,
  );

  // 3. Validate that at least one root category exists (parent_id=null, depth=1)
  const roots = output.data.filter((cat) => !cat.parent_id && cat.depth === 1);
  TestValidator.predicate("at least one root category")(roots.length > 0);

  // 4. Validate that each subcategory (parent_id != null) references a valid id in the dataset
  const allCategoryIds = new Set(output.data.map((cat) => cat.id));
  for (const cat of output.data) {
    if (cat.parent_id) {
      TestValidator.predicate(`parent_id of category ${cat.id} exists`)(
        allCategoryIds.has(cat.parent_id),
      );
    }
    TestValidator.predicate(`depth of category ${cat.id} > 0`)(cat.depth > 0);
  }
}
