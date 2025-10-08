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
import type { IShoppingMallOrderAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderAddress";
import type { IShoppingMallOrderPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderPaymentMethod";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallReviewReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewReply";

/**
 * Validate public access and visibility rules for product review replies.
 *
 * 1. Register admin and customer
 * 2. Admin creates a product category and product
 * 3. Customer creates an order address
 * 4. Admin creates a payment method
 * 5. Customer places and completes an order
 * 6. Customer submits a review
 * 7. Admin posts a public reply and a hidden reply
 * 8. Verify as anonymous user:
 *
 *    - Can fetch public reply (fields: author, body, status, timestamps, relation)
 *    - Cannot fetch hidden reply (expect error)
 *    - Cannot fetch with wrong productId, reviewId, or replyId (expect error)
 * 9. (Optional) Verify as admin that hidden reply is accessible (if future
 *    endpoints permit role-based fetch)
 */
export async function test_api_review_reply_detail_public_access_and_visibility_rules(
  connection: api.IConnection,
) {
  // 1. Register admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      full_name: RandomGenerator.name(),
    },
  });
  typia.assert(admin);

  // 2. Register customer
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphaNumeric(12);
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      full_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      address: {
        recipient_name: RandomGenerator.name(1),
        phone: RandomGenerator.mobile(),
        region: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 3,
          wordMax: 8,
        }),
        postal_code: RandomGenerator.alphaNumeric(5),
        address_line1: RandomGenerator.paragraph({ sentences: 2 }),
        is_default: true,
      } satisfies IShoppingMallCustomerAddress.ICreate,
    },
  });
  typia.assert(customer);

  // 3. Create product category
  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        name_ko: RandomGenerator.name(1),
        name_en: RandomGenerator.name(1),
        display_order: 0,
        is_active: true,
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // 4. Create product (admin acts as seller for this test)
  const product = await api.functional.shoppingMall.admin.products.create(
    connection,
    {
      body: {
        shopping_mall_seller_id: admin.id,
        shopping_mall_category_id: category.id,
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        is_active: true,
      },
    },
  );
  typia.assert(product);

  // 5. Customer creates order address (snapshot)
  const orderAddress =
    await api.functional.shoppingMall.customer.orderAddresses.create(
      connection,
      {
        body: {
          address_type: "shipping",
          recipient_name: RandomGenerator.name(1),
          phone: RandomGenerator.mobile(),
          zip_code: RandomGenerator.alphaNumeric(5),
          address_main: RandomGenerator.paragraph({ sentences: 2 }),
          country_code: "KOR",
        },
      },
    );
  typia.assert(orderAddress);

  // 6. Admin creates payment method
  const paymentMethod =
    await api.functional.shoppingMall.admin.orderPaymentMethods.create(
      connection,
      {
        body: {
          payment_method_type: "card",
          method_data: '{"last4":"4321"}',
          display_name: "Visa ****4321",
        },
      },
    );
  typia.assert(paymentMethod);

  // 7. Customer places order
  const order = await api.functional.shoppingMall.customer.orders.create(
    connection,
    {
      body: {
        shipping_address_id: orderAddress.id,
        payment_method_id: paymentMethod.id,
        order_total: 9990,
        currency: "KRW",
      },
    },
  );
  typia.assert(order);

  // 8. Customer creates review
  const review =
    await api.functional.shoppingMall.customer.products.reviews.create(
      connection,
      {
        productId: product.id,
        body: {
          shopping_mall_order_id: order.id,
          rating: 5,
          body: RandomGenerator.paragraph({ sentences: 5 }),
        },
      },
    );
  typia.assert(review);

  // 9. Admin posts a public reply
  const publicReply =
    await api.functional.shoppingMall.admin.products.reviews.replies.create(
      connection,
      {
        productId: product.id,
        reviewId: review.id,
        body: {
          body: RandomGenerator.paragraph({ sentences: 2 }),
          status: "public",
        },
      },
    );
  typia.assert(publicReply);

  // 10. Admin posts a hidden reply
  const hiddenReply =
    await api.functional.shoppingMall.admin.products.reviews.replies.create(
      connection,
      {
        productId: product.id,
        reviewId: review.id,
        body: {
          body: RandomGenerator.paragraph({ sentences: 2 }),
          status: "hidden",
        },
      },
    );
  typia.assert(hiddenReply);

  // 11. As unauthenticated (public) user, fetch the public reply
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  const fetchedPublic =
    await api.functional.shoppingMall.products.reviews.replies.at(unauthConn, {
      productId: product.id,
      reviewId: review.id,
      replyId: publicReply.id,
    });
  typia.assert(fetchedPublic);
  TestValidator.equals(
    "public reply fields",
    fetchedPublic.body,
    publicReply.body,
  );
  TestValidator.equals("public reply status", fetchedPublic.status, "public");
  TestValidator.equals(
    "public reply relation: productId",
    fetchedPublic.productId,
    product.id,
  );
  TestValidator.equals(
    "public reply relation: reviewId",
    fetchedPublic.reviewId,
    review.id,
  );
  TestValidator.equals("public reply deletedAt", fetchedPublic.deletedAt, null);

  // 12. As unauthenticated, try to fetch hidden reply -> expect 404 (not found)
  await TestValidator.error(
    "cannot fetch hidden reply as general user",
    async () => {
      await api.functional.shoppingMall.products.reviews.replies.at(
        unauthConn,
        {
          productId: product.id,
          reviewId: review.id,
          replyId: hiddenReply.id,
        },
      );
    },
  );

  // 13. Fetch reply with wrong productId, expect 404
  await TestValidator.error("invalid productId", async () => {
    await api.functional.shoppingMall.products.reviews.replies.at(unauthConn, {
      productId: typia.random<string & tags.Format<"uuid">>(),
      reviewId: review.id,
      replyId: publicReply.id,
    });
  });
  // 14. Fetch reply with wrong reviewId, expect 404
  await TestValidator.error("invalid reviewId", async () => {
    await api.functional.shoppingMall.products.reviews.replies.at(unauthConn, {
      productId: product.id,
      reviewId: typia.random<string & tags.Format<"uuid">>(),
      replyId: publicReply.id,
    });
  });
  // 15. Fetch reply with wrong replyId, expect 404
  await TestValidator.error("invalid replyId", async () => {
    await api.functional.shoppingMall.products.reviews.replies.at(unauthConn, {
      productId: product.id,
      reviewId: review.id,
      replyId: typia.random<string & tags.Format<"uuid">>(),
    });
  });
}
