import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSeller";
import type { IAimallBackendCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCategory";

/**
 * Test the ability for a seller to delete an owned child category that has no
 * associated products or subcategories.
 *
 * This simulates the workflow:
 *
 * 1. Register a seller account (simulates onboarding)
 * 2. Create a parent category (root, depth=1)
 * 3. Create a child category under this parent (depth=2, parent_id set)
 * 4. Delete the child category with the dedicated DELETE endpoint
 * 5. Validate the DELETE succeeded by attempting to create a new child with the
 *    same name under the parent
 *
 * The test confirms that after deletion, the child category is removed, and
 * creation of a new child with the same name is allowed (uniqueness enforced
 * among siblings by name).
 */
export async function test_api_aimall_backend_seller_categories_childCategories_eraseByCategoryidAndChildcategoryid(
  connection: api.IConnection,
) {
  // 1. Register a seller account
  const sellerData: IAimallBackendSeller.ICreate = {
    business_name: RandomGenerator.name(),
    email: typia.random<string & tags.Format<"email">>(),
    contact_phone: RandomGenerator.mobile(),
    status: "pending",
  };
  const seller =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      { body: sellerData },
    );
  typia.assert(seller);

  // 2. Create parent category (depth=1, null parent)
  const parentCategoryReq: IAimallBackendCategory.ICreate = {
    parent_id: null,
    name: RandomGenerator.alphabets(8),
    depth: 1,
  };
  const parentCategory =
    await api.functional.aimall_backend.seller.categories.create(connection, {
      body: parentCategoryReq,
    });
  typia.assert(parentCategory);

  // 3. Create child category (depth=2, parent_id is parentCategory.id)
  const childCategoryName = RandomGenerator.alphabets(8);
  const childCategoryReq: IAimallBackendCategory.ICreate = {
    parent_id: parentCategory.id,
    name: childCategoryName,
    depth: 2,
  };
  const childCategory =
    await api.functional.aimall_backend.seller.categories.childCategories.create(
      connection,
      {
        categoryId: parentCategory.id,
        body: childCategoryReq,
      },
    );
  typia.assert(childCategory);

  // 4. Delete the child category
  await api.functional.aimall_backend.seller.categories.childCategories.erase(
    connection,
    {
      categoryId: parentCategory.id,
      childCategoryId: childCategory.id,
    },
  );

  // 5. Attempt to re-create a child with the exact same name (should now succeed if deleted)
  const newChildCategory =
    await api.functional.aimall_backend.seller.categories.childCategories.create(
      connection,
      {
        categoryId: parentCategory.id,
        body: {
          parent_id: parentCategory.id,
          name: childCategoryName,
          depth: 2,
        },
      },
    );
  typia.assert(newChildCategory);
  TestValidator.equals("recreated child name")(newChildCategory.name)(
    childCategoryName,
  );
}
