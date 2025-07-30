import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCategory";

/**
 * Validate that a seller cannot create two sibling child categories with the
 * same name under a single parent category.
 *
 * This test ensures category uniqueness enforcement at the sibling level during
 * taxonomy management by a seller.
 *
 * Steps:
 *
 * 1. Create a parent/root category (depth=1, parent_id=null) with a unique name.
 * 2. Add a child category (depth=2) under this parent with a unique name (A).
 * 3. Attempt to add another child under the same parent using the same name (A).
 * 4. Expect an error indicating violation of name uniqueness among siblings.
 *
 * This covers both success (creating legitimate categories) and failure
 * (duplicate sibling name) scenarios central to taxonomy business rules.
 */
export async function test_api_aimall_backend_seller_categories_test_seller_create_child_category_duplicate_sibling_name(
  connection: api.IConnection,
) {
  // 1. Create a root (parent) category
  const parentCategory =
    await api.functional.aimall_backend.seller.categories.create(connection, {
      body: {
        parent_id: null,
        name: RandomGenerator.alphaNumeric(10),
        depth: 1,
      } satisfies IAimallBackendCategory.ICreate,
    });
  typia.assert(parentCategory);

  // 2. Create a child category under this parent
  const childName = RandomGenerator.alphaNumeric(10);
  const firstChild =
    await api.functional.aimall_backend.seller.categories.childCategories.create(
      connection,
      {
        categoryId: parentCategory.id,
        body: {
          name: childName,
          depth: 2,
        } satisfies IAimallBackendCategory.ICreate,
      },
    );
  typia.assert(firstChild);

  // 3. Attempt to create another child with the same name under the same parent
  await TestValidator.error(
    "duplicate child category name under same parent should fail",
  )(async () => {
    await api.functional.aimall_backend.seller.categories.childCategories.create(
      connection,
      {
        categoryId: parentCategory.id,
        body: {
          name: childName, // duplicate name
          depth: 2,
        } satisfies IAimallBackendCategory.ICreate,
      },
    );
  });
}
