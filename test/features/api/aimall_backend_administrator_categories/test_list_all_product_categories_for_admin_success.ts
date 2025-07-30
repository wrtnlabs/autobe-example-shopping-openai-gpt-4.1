import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPageIAimallBackendCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendCategory";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAimallBackendCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCategory";

/**
 * Validates that an administrator can retrieve the full list of all product
 * taxonomy categories for management and selection.
 *
 * - Ensures that both visible and hidden/system categories are included (i.e.,
 *   not just those customers/sellers can see).
 * - Confirms all atomic fields of IAimallBackendCategory schema are present in
 *   each record.
 * - Checks hierarchical structure: each category has correct parent_id, depth,
 *   and ID (roots have parent_id null).
 * - Enables admin to perform category/taxonomy management workflows accurately.
 * - Ensures pagination format (IPageIAimallBackendCategory) is followed and all
 *   pagination fields are present.
 *
 * Steps:
 *
 * 1. Admin calls endpoint to fetch all categories.
 * 2. Assert that returned data is an array of IAimallBackendCategory objects.
 * 3. Each category object contains id (uuid), parent_id (uuid|null), name
 *    (string), and depth (number>0).
 * 4. Pagination metadata is present and well-formed.
 * 5. Optionally, test that the list includes at least one category with parent_id
 *    null (root), and verify at least some with depth>1 for hierarchy.
 */
export async function test_api_aimall_backend_administrator_categories_index(
  connection: api.IConnection,
) {
  // 1. Admin fetches the full list with system/hidden categories.
  const output =
    await api.functional.aimall_backend.administrator.categories.index(
      connection,
    );
  typia.assert(output);

  // 2. Validate pagination metadata exists and is well-formed.
  const pagination = output.pagination;
  typia.assert(pagination);
  TestValidator.predicate("current page > 0")(pagination.current > 0);
  TestValidator.predicate("limit > 0")(pagination.limit > 0);
  TestValidator.predicate("total records >= 0")(pagination.records >= 0);
  TestValidator.predicate("pages >= 1")(pagination.pages >= 1);

  // 3. Validate each category object for required fields and type correctness.
  for (const category of output.data) {
    typia.assert(category);
    TestValidator.predicate("category id format is uuid")(
      typeof category.id === "string" &&
        /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$/.test(
          category.id,
        ),
    );
    if (category.parent_id !== undefined && category.parent_id !== null)
      TestValidator.predicate("parent_id format is uuid")(
        typeof category.parent_id === "string" &&
          /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$/.test(
            category.parent_id,
          ),
      );
    TestValidator.predicate("category name is string")(
      typeof category.name === "string" && category.name.length > 0,
    );
    TestValidator.predicate("category depth > 0")(
      typeof category.depth === "number" && category.depth > 0,
    );
  }

  // 4. Optionally check for at least one root (parent_id null/undefined) and nested (depth > 1) category.
  const roots = output.data.filter(
    (cat) => cat.parent_id === null || cat.parent_id === undefined,
  );
  TestValidator.predicate("at least one root category exists")(
    roots.length > 0,
  );
  const nested = output.data.filter((cat) => cat.depth > 1);
  TestValidator.predicate("at least some nested categories exist")(
    nested.length > 0,
  );
}
