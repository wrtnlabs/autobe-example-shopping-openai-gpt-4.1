import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCategory";

/**
 * Validate that a seller can successfully update the name of an existing
 * product category they have access to.
 *
 * This test ensures that:
 *
 * 1. A category is first created via an administrator-level API call (dependency)
 *    to simulate the existence of a managed category.
 * 2. A seller updates only the 'name' field of this category using the
 *    seller-specific update endpoint.
 * 3. The put operation is permitted according to business/permissions logic.
 * 4. The category name reflects the new value returned in the response, while all
 *    other fields (id, parent_id, depth) remain unchanged.
 * 5. Runtime type validations are performed on results, and business logic is
 *    verified by explicit assertions.
 */
export async function test_api_aimall_backend_seller_categories_test_update_category_name_success_seller(
  connection: api.IConnection,
) {
  // 1. Create initial category as administrator (dependency set up)
  const initialCategoryName = RandomGenerator.alphaNumeric(8);
  const initialCategoryBody: IAimallBackendCategory.ICreate = {
    name: initialCategoryName,
    parent_id: null,
    depth: 1,
  };
  const category =
    await api.functional.aimall_backend.administrator.categories.create(
      connection,
      {
        body: initialCategoryBody,
      },
    );
  typia.assert(category);

  // 2. Seller updates only the category 'name'
  const updatedCategoryName = RandomGenerator.alphaNumeric(12);
  const updated = await api.functional.aimall_backend.seller.categories.update(
    connection,
    {
      categoryId: category.id,
      body: {
        name: updatedCategoryName,
      },
    },
  );
  typia.assert(updated);

  // 3. Assert updated field is reflected and others unchanged
  TestValidator.equals("category id unchanged")(updated.id)(category.id);
  TestValidator.equals("parent_id unchanged")(updated.parent_id)(
    category.parent_id,
  );
  TestValidator.equals("depth unchanged")(updated.depth)(category.depth);
  TestValidator.equals("name updated")(updated.name)(updatedCategoryName);
}
