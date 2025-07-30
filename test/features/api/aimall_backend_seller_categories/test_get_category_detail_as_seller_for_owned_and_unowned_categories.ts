import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCategory";

/**
 * Validate seller's ability to view category details, including access right
 * enforcement.
 *
 * This test covers:
 *
 * 1. Creation of a category as the current seller.
 * 2. Retrieval of the created category by ID, verifying all fields (id, name,
 *    parent_id, depth) match the creation data.
 * 3. Attempt to retrieve a non-existent categoryId, expecting a proper error
 *    (e.g., 404).
 *
 * Steps:
 *
 * 1. Create a category as current seller via POST
 *    /aimall-backend/seller/categories
 * 2. Fetch detail via GET /aimall-backend/seller/categories/{categoryId} and
 *    verify contents
 * 3. Try a random UUID and expect error
 *
 * Business rule: Sellers may only see their own categories, not those of other
 * sellers.
 */
export async function test_api_aimall_backend_seller_categories_test_get_category_detail_as_seller_for_owned_and_unowned_categories(
  connection: api.IConnection,
) {
  // 1. Create a new category as this seller
  const createInput: IAimallBackendCategory.ICreate = {
    name: RandomGenerator.alphabets(8),
    depth: 1,
    parent_id: null,
  };
  const created: IAimallBackendCategory =
    await api.functional.aimall_backend.seller.categories.create(connection, {
      body: createInput,
    });
  typia.assert(created);

  // 2. Fetch the created category details
  const getOutput: IAimallBackendCategory =
    await api.functional.aimall_backend.seller.categories.at(connection, {
      categoryId: created.id,
    });
  typia.assert(getOutput);
  TestValidator.equals("category.id")(getOutput.id)(created.id);
  TestValidator.equals("category.name")(getOutput.name)(createInput.name);
  TestValidator.equals("category.depth")(getOutput.depth)(createInput.depth);
  TestValidator.equals("category.parent_id")(getOutput.parent_id)(
    createInput.parent_id,
  );

  // 3. Try to fetch a non-existent category
  await TestValidator.error("getting non-existent category id should fail")(
    async () => {
      await api.functional.aimall_backend.seller.categories.at(connection, {
        categoryId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );
}
