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
 * Validate the admin reply-to-review creation logic.
 *
 * This test ensures that:
 *
 * 1. Admin registration/join is possible and produces a valid admin session.
 * 2. A product category can be created by admin.
 * 3. An admin can create a product in the new category.
 * 4. There is a valid review for the product (simulate prior customer behavior).
 * 5. Admin can post a reply to that review using admin context, providing body and
 *    status (random public/hidden).
 * 6. The reply is correctly created and returned, linked to the review/product,
 *    attributed to the admin user, and response has all required fields and
 *    types.
 * 7. Business rules are followed: admin can reply regardless of product ownership.
 * 8. Visibility status of reply matches requested (public/hidden).
 * 9. Audit (createdAt/updatedAt) and association fields are returned and valid.
 */
export async function test_api_admin_review_reply_creation(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate as admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminInput = {
    email: adminEmail,
    password: RandomGenerator.alphaNumeric(12),
    full_name: RandomGenerator.name(),
    status: "active",
  } satisfies IShoppingMallAdmin.ICreate;
  const admin = await api.functional.auth.admin.join(connection, {
    body: adminInput,
  });
  typia.assert(admin);

  // Step 2: Create a product category
  const categoryInput = {
    name_ko: RandomGenerator.paragraph({ sentences: 2 }),
    name_en: RandomGenerator.paragraph({ sentences: 2 }),
    display_order: typia.random<number & tags.Type<"int32">>(),
    is_active: true,
  } satisfies IShoppingMallCategory.ICreate;
  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    { body: categoryInput },
  );
  typia.assert(category);

  // Step 3: Create a product as admin
  const productInput = {
    shopping_mall_seller_id: typia.random<string & tags.Format<"uuid">>(), // not required for ownership as admin
    shopping_mall_category_id: category.id,
    name: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
    is_active: true,
  } satisfies IShoppingMallProduct.ICreate;
  const product = await api.functional.shoppingMall.admin.products.create(
    connection,
    { body: productInput },
  );
  typia.assert(product);

  // Step 4: Simulate customer review (review creation)
  const reviewInput = {
    shopping_mall_order_id: typia.random<string & tags.Format<"uuid">>(),
    rating: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
    >(),
    body: RandomGenerator.paragraph({ sentences: 8 }),
  } satisfies IShoppingMallReview.ICreate;
  const review =
    await api.functional.shoppingMall.customer.products.reviews.create(
      connection,
      { productId: product.id, body: reviewInput },
    );
  typia.assert(review);

  // Step 5: Admin replies to the review
  const replyBody = RandomGenerator.paragraph({ sentences: 4 });
  const replyStatus = RandomGenerator.pick(["public", "hidden"] as const);
  const replyInput = {
    body: replyBody,
    status: replyStatus,
  } satisfies IShoppingMallReviewReply.ICreate;
  const reply =
    await api.functional.shoppingMall.admin.products.reviews.replies.create(
      connection,
      {
        productId: product.id,
        reviewId: review.id,
        body: replyInput,
      },
    );
  typia.assert(reply);

  // Step 6: Validate reply associations and fields
  TestValidator.equals("reply linked to review", reply.reviewId, review.id);
  TestValidator.equals("reply linked to product", reply.productId, product.id);
  TestValidator.equals("reply body matches", reply.body, replyBody);
  TestValidator.equals("reply status matches", reply.status, replyStatus);
  TestValidator.predicate(
    "adminId is present",
    typeof reply.adminId === "string" &&
      reply.adminId !== null &&
      reply.adminId !== undefined,
  );
  TestValidator.equals(
    "sellerId is null for admin reply",
    reply.sellerId,
    null,
  );
  TestValidator.predicate(
    "reply createdAt is ISO date-time",
    typeof reply.createdAt === "string" && reply.createdAt.endsWith("Z"),
  );
  TestValidator.predicate(
    "reply updatedAt is ISO date-time",
    typeof reply.updatedAt === "string" && reply.updatedAt.endsWith("Z"),
  );
  TestValidator.equals("reply not deleted", reply.deletedAt, null);
}
