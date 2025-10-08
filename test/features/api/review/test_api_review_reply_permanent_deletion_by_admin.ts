import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallReviewReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewReply";

/**
 * Permanently delete a reply to a product review as an admin.
 *
 * 1. Register and authenticate as admin
 * 2. Create a category
 * 3. Create a product within the category
 * 4. Register and authenticate a customer
 * 5. Customer places an order for product (mock payload)
 * 6. Customer writes a review for purchased product
 * 7. Admin posts a reply to the review
 * 8. Permanently delete the reply as admin
 * 9. Confirm reply cannot be deleted again (error case)
 */
export async function test_api_review_reply_permanent_deletion_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin registers/authenticates
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    full_name: RandomGenerator.name(),
    status: "active",
  } satisfies IShoppingMallAdmin.ICreate;
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinBody });
  typia.assert(admin);

  // 2. Create a category
  const categoryBody = {
    name_ko: RandomGenerator.paragraph({ sentences: 3 }),
    name_en: RandomGenerator.paragraph({ sentences: 2 }),
    display_order: typia.random<number & tags.Type<"int32">>(),
    is_active: true,
  } satisfies IShoppingMallCategory.ICreate;
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryBody,
    });
  typia.assert(category);

  // 3. Create a product linked to category
  const productBody = {
    shopping_mall_seller_id: admin.id, // Use admin id as test seller
    shopping_mall_category_id: category.id,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    is_active: true,
    main_image_url: null,
  } satisfies IShoppingMallProduct.ICreate;
  const product = await api.functional.shoppingMall.admin.products.create(
    connection,
    { body: productBody },
  );
  typia.assert(product);

  // 4. Register customer
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    address: {
      recipient_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      region: RandomGenerator.paragraph({ sentences: 2 }),
      postal_code: RandomGenerator.alphaNumeric(6),
      address_line1: RandomGenerator.paragraph(),
      is_default: true,
    },
  } satisfies IShoppingMallCustomer.IJoin;
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customer);

  // 5. Place order as customer
  // Use plausible ids - normally, these would be pulled from customer and payment setup APIs
  const orderBody: IShoppingMallOrder.ICreate = {
    shopping_mall_customer_id: customer.id,
    shipping_address_id: typia.random<string & tags.Format<"uuid">>(),
    payment_method_id: typia.random<string & tags.Format<"uuid">>(),
    order_total: 24000,
    currency: "KRW",
  };
  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderBody,
    });
  typia.assert(order);

  // 6. Customer creates review for product
  const reviewBody = {
    shopping_mall_order_id: order.id,
    rating: 5,
    body: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies IShoppingMallReview.ICreate;
  const review =
    await api.functional.shoppingMall.customer.products.reviews.create(
      connection,
      { productId: product.id, body: reviewBody },
    );
  typia.assert(review);

  // 7. Admin posts a reply
  const replyBody = {
    body: RandomGenerator.paragraph({ sentences: 4 }),
    status: "public",
  } satisfies IShoppingMallReviewReply.ICreate;
  const reply =
    await api.functional.shoppingMall.admin.products.reviews.replies.create(
      connection,
      { productId: product.id, reviewId: review.id, body: replyBody },
    );
  typia.assert(reply);

  // 8. Admin deletes the reply (permanent deletion)
  await api.functional.shoppingMall.admin.products.reviews.replies.erase(
    connection,
    { productId: product.id, reviewId: review.id, replyId: reply.id },
  );
  // There is no reply GET/list API to confirm from, but next step covers indirect error check.

  // 9. Attempt to delete reply again, should return error
  await TestValidator.error(
    "attempting to delete already deleted reply returns error",
    async () => {
      await api.functional.shoppingMall.admin.products.reviews.replies.erase(
        connection,
        { productId: product.id, reviewId: review.id, replyId: reply.id },
      );
    },
  );
}
