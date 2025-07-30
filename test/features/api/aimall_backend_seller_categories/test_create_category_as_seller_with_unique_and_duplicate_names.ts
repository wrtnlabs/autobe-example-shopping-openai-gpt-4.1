import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCategory";

/**
 * Validate seller creation of product categories under taxonomy constraints.
 *
 * This test ensures the POST /aimall-backend/seller/categories endpoint
 * correctly allows only authorized sellers/administrators to create new product
 * taxonomy categories. It confirms that a root category can be created when a
 * unique name is supplied, and verifies that all returned fields—such as id,
 * parent_id (null in root case), and depth—fit the input and system
 * expectations.
 *
 * Then, the test attempts to create another category under the same parent (or
 * root) with an identical name, expecting the API to enforce uniqueness
 * constraints and reject the duplicate (with a conflict error or similar
 * business validation).
 *
 * Finally, the test attempts to create a category using a non-existent
 * parent_id (random UUID not tied to any category), expecting to encounter a
 * validation or foreign-key/reference error.
 *
 * Steps:
 *
 * 1. Successfully create a root category (parent_id: null, depth: 1) with a unique
 *    name. Validate the created category's fields.
 * 2. Attempt to create another category (same name, same parent_id) and expect
 *    uniqueness constraint violation error (conflict or similar).
 * 3. Attempt to create a category with a random, non-existent parent_id and expect
 *    an error (reference/validation failure).
 */
export async function test_api_aimall_backend_seller_categories_test_create_category_as_seller_with_unique_and_duplicate_names(
  connection: api.IConnection,
) {
  // 1. Successfully create a root category with a unique name
  const categoryName: string = RandomGenerator.alphabets(12);
  const rootCategoryInput: IAimallBackendCategory.ICreate = {
    name: categoryName,
    parent_id: null,
    depth: 1,
  };
  const rootCategory: IAimallBackendCategory =
    await api.functional.aimall_backend.seller.categories.create(connection, {
      body: rootCategoryInput,
    });
  typia.assert(rootCategory);
  TestValidator.equals("category name")(rootCategory.name)(categoryName);
  TestValidator.equals("root parent")(rootCategory.parent_id)(null);
  TestValidator.equals("depth")(rootCategory.depth)(1);

  // 2. Attempt to create a duplicate category name under the same parent (should fail)
  TestValidator.error("duplicate category unique constraint")(async () => {
    await api.functional.aimall_backend.seller.categories.create(connection, {
      body: rootCategoryInput,
    });
  });

  // 3. Attempt to create with a non-existent parent_id (should fail)
  const nonExistentParentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const inputWithInvalidParent: IAimallBackendCategory.ICreate = {
    name: RandomGenerator.alphabets(12),
    parent_id: nonExistentParentId,
    depth: 2,
  };
  TestValidator.error("non-existent parent_id constraint")(async () => {
    await api.functional.aimall_backend.seller.categories.create(connection, {
      body: inputWithInvalidParent,
    });
  });
}
