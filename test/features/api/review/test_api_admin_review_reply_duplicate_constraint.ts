import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallReviewReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewReply";

/**
 * Test that an admin can only reply once per review and that the API enforces a
 * unique constraint for admin replies.
 *
 * Steps:
 *
 * 1. Register an admin and get authorization.
 * 2. Create a category as admin.
 * 3. Create a product in the category as admin (must provide valid seller ID for
 *    product creation).
 * 4. As admin, simulate a customer review for the product (normally would require
 *    customer authentication/purchase, but here the setup uses admin context
 *    per available dependencies).
 * 5. As admin, post a reply to the review.
 * 6. Attempt to post a second reply to the same review as the same admin, which
 *    should fail due to the unique constraint.
 * 7. Assert that the first reply is successful and the duplicate attempt results
 *    in a business error.
 */
export async function test_api_admin_review_reply_duplicate_constraint(
  connection: api.IConnection,
) {
  // 1. Register admin and get token
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Admin123!@#",
      full_name: RandomGenerator.name(),
      status: "active",
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // 2. Create a category (for product)
  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        name_ko: RandomGenerator.paragraph({ sentences: 2 }),
        name_en: RandomGenerator.paragraph({ sentences: 2 }),
        display_order: 0,
        is_active: true,
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // 3. Create a product under this category (admin can attribute self as seller)
  const product = await api.functional.shoppingMall.admin.products.create(
    connection,
    {
      body: {
        shopping_mall_seller_id: admin.id satisfies string as string,
        shopping_mall_category_id: category.id,
        name: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 10,
          sentenceMax: 20,
        }),
        is_active: true,
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);

  // 4. Create a review for the product as a simulated customer (order id/customer id simulated/random)
  const fakeOrderId = typia.random<string & tags.Format<"uuid">>();
  const review =
    await api.functional.shoppingMall.customer.products.reviews.create(
      connection,
      {
        productId: product.id,
        body: {
          shopping_mall_order_id: fakeOrderId,
          rating: 5,
          body: RandomGenerator.paragraph({ sentences: 15 }),
        } satisfies IShoppingMallReview.ICreate,
      },
    );
  typia.assert(review);

  // 5. Post the first reply as admin
  const replyBody = {
    body: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
    status: "public",
  } satisfies IShoppingMallReviewReply.ICreate;
  const reply =
    await api.functional.shoppingMall.admin.products.reviews.replies.create(
      connection,
      {
        productId: product.id,
        reviewId: review.id,
        body: replyBody,
      },
    );
  typia.assert(reply);
  TestValidator.equals(
    "first reply content matches",
    reply.body,
    replyBody.body,
  );

  // 6. Attempt to post a duplicate reply as admin -- must error
  await TestValidator.error(
    "admin cannot reply twice to same review",
    async () => {
      await api.functional.shoppingMall.admin.products.reviews.replies.create(
        connection,
        {
          productId: product.id,
          reviewId: review.id,
          body: replyBody,
        },
      );
    },
  );
}
