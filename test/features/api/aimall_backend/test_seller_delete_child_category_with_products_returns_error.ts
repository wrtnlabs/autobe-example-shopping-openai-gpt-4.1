import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSeller";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCategory";

/**
 * Validate that attempting to delete a child category with assigned products
 * fails.
 *
 * This test ensures the backend enforces business/DB integrity by preventing
 * the deletion of a child product category if there are products referencing
 * it. The workflow mimics real seller operations:
 *
 * 1. Register a seller account.
 * 2. Create a parent category (depth 1, no parent).
 * 3. Create a child category under the parent (depth 2).
 * 4. Register a product assigning it to the child category.
 * 5. Attempt to delete the child category (should result in error).
 *
 * Each step uses strongly typed input and output and validates types and
 * expected error cases appropriately.
 */
export async function test_api_aimall_backend_test_seller_delete_child_category_with_products_returns_error(
  connection: api.IConnection,
) {
  // 1. Register a seller account.
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller: IAimallBackendSeller =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      {
        body: {
          business_name: RandomGenerator.alphaNumeric(8),
          email: sellerEmail,
          contact_phone: RandomGenerator.mobile(),
          status: "approved",
        } satisfies IAimallBackendSeller.ICreate,
      },
    );
  typia.assert(seller);

  // 2. Create a parent category (depth = 1, no parent)
  const parentCategory: IAimallBackendCategory =
    await api.functional.aimall_backend.seller.categories.create(connection, {
      body: {
        name: RandomGenerator.alphaNumeric(6),
        depth: 1,
        parent_id: null,
      } satisfies IAimallBackendCategory.ICreate,
    });
  typia.assert(parentCategory);

  // 3. Create a child category (depth = 2, parent_id = parentCategory.id)
  const childCategory: IAimallBackendCategory =
    await api.functional.aimall_backend.seller.categories.childCategories.create(
      connection,
      {
        categoryId: parentCategory.id,
        body: {
          name: RandomGenerator.alphaNumeric(6),
          depth: 2,
          parent_id: parentCategory.id,
        } satisfies IAimallBackendCategory.ICreate,
      },
    );
  typia.assert(childCategory);

  // 4. Register a product assigned to this child category
  const product: IAimallBackendProduct =
    await api.functional.aimall_backend.seller.products.create(connection, {
      body: {
        category_id: childCategory.id,
        seller_id: seller.id,
        title: RandomGenerator.paragraph()(),
        description: RandomGenerator.content()()(),
        status: "active",
      } satisfies IAimallBackendProduct.ICreate,
    });
  typia.assert(product);

  // 5. Attempt to delete the child category (should fail due to product assignment)
  await TestValidator.error("Deleting category with products should fail")(
    async () => {
      await api.functional.aimall_backend.seller.categories.childCategories.erase(
        connection,
        {
          categoryId: parentCategory.id,
          childCategoryId: childCategory.id,
        },
      );
    },
  );
}
