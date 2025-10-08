import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallReviewReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewReply";

/**
 * Validate error response when attempting to create a reply as admin to a
 * non-existent review on a specific product.
 *
 * 1. Authenticate as admin using the join endpoint to establish session.
 * 2. Create a category for testing using admin category create API.
 * 3. Create a product under the new category with admin product create API.
 * 4. Use the product's id and a RANDOM (non-existent) reviewId to attempt to
 *    create a reply as admin.
 * 5. Confirm that the create-reply endpoint returns an error due to the review not
 *    existing for the given product (business logic enforcement).
 */
export async function test_api_admin_review_reply_to_nonexistent_review(
  connection: api.IConnection,
) {
  // 1. Register admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "1234!test",
        full_name: RandomGenerator.name(2),
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Create category
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        name_ko: RandomGenerator.name(1),
        name_en: RandomGenerator.name(1),
        display_order: 0,
        is_active: true,
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(category);

  // 3. Create product
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.admin.products.create(connection, {
      body: {
        shopping_mall_seller_id: admin.id,
        shopping_mall_category_id: category.id,
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        is_active: true,
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(product);

  // 4. Attempt to create reply to non-existent review
  const fakeReviewId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "should fail to create admin reply to non-existent review",
    async () => {
      await api.functional.shoppingMall.admin.products.reviews.replies.create(
        connection,
        {
          productId: product.id,
          reviewId: fakeReviewId,
          body: {
            body: RandomGenerator.paragraph({ sentences: 3 }),
            status: "public",
          } satisfies IShoppingMallReviewReply.ICreate,
        },
      );
    },
  );
}
