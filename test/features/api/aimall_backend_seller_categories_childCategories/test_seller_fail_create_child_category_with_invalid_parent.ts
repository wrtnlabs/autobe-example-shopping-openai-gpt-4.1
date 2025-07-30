import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCategory";

/**
 * Validates failure of child category creation with an invalid or non-existent
 * parent categoryId.
 *
 * Ensures that the system rejects requests to create a child category when the
 * specified parent does not exist. The business rules for category hierarchy
 * require that the parent category exists before creating child categories. No
 * setup dependencies are relied upon; a random UUID is assumed to never match
 * any real parent in a typical clean test environment. This verifies
 * server-side validation of parent linkage integrity.
 *
 * Test process:
 *
 * 1. Generate a random UUID for parent categoryId (guaranteed invalid in normal
 *    test conditions).
 * 2. Attempt to create a new child category under this invalid parent, using
 *    random but valid category creation body fields.
 * 3. Assert that the creation fails (API throws an error), as required by business
 *    logic.
 * 4. No child category should be created; test passes if error is thrown.
 */
export async function test_api_aimall_backend_seller_categories_childCategories_test_seller_fail_create_child_category_with_invalid_parent(
  connection: api.IConnection,
) {
  // 1. Generate a random, nonexistent parent categoryId (UUID)
  const invalidParentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 2. Prepare child category creation body (valid fields, but invalid parent linkage)
  const createBody: IAimallBackendCategory.ICreate = {
    name: RandomGenerator.alphabets(8),
    depth: 2, // typically denotes subcategory under a parent
  };

  // 3. Attempt the API call and assert it fails with an error
  await TestValidator.error("Should fail: parent category does not exist")(
    async () => {
      await api.functional.aimall_backend.seller.categories.childCategories.create(
        connection,
        {
          categoryId: invalidParentId,
          body: createBody,
        },
      );
    },
  );
}
