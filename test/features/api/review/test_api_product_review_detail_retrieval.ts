import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";

/**
 * Validate that attempting to retrieve a product review via
 * /shoppingMall/products/{productId}/reviews/{reviewId} returns error when no
 * such review exists or for mismatched product and review IDs. Currently only
 * the error scenario can be tested as there is no API to create a review
 * entity.
 *
 * Steps:
 *
 * 1. Register an admin via /auth/admin/join
 * 2. Create a category via /shoppingMall/admin/categories
 * 3. Create a product under the new category via /shoppingMall/admin/products
 * 4. (Cannot create a review; only error case is tested)
 * 5. Attempt to fetch a review by random valid-format IDs for product and review;
 *    expect error.
 * 6. Edge: error again for mismatch/random IDs.
 */
export async function test_api_product_review_detail_retrieval(
  connection: api.IConnection,
) {
  // 1. Register admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminFullName = RandomGenerator.name();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "TestAdmin123!",
        full_name: adminFullName,
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Create a category
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        name_ko: RandomGenerator.name(),
        name_en: RandomGenerator.name(),
        display_order: 0,
        is_active: true,
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(category);

  // 3. Create a product under the new category
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.admin.products.create(connection, {
      body: {
        shopping_mall_seller_id: admin.id,
        shopping_mall_category_id: category.id,
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 10 }),
        is_active: true,
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(product);

  // 4. As review creation API does not exist, only error test is performed
  await TestValidator.error(
    "should fail if review does not exist",
    async () => {
      await api.functional.shoppingMall.products.reviews.at(connection, {
        productId: product.id,
        reviewId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );

  // 5. Edge: error for random product & review ID combination
  await TestValidator.error(
    "should fail for mismatched product and review IDs",
    async () => {
      await api.functional.shoppingMall.products.reviews.at(connection, {
        productId: typia.random<string & tags.Format<"uuid">>(),
        reviewId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );
}
