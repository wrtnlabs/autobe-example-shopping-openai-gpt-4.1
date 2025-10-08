import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderAddress";
import type { IShoppingMallOrderPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderPaymentMethod";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallReviewFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewFlag";

/**
 * Validates customer ability to flag a product review after full e-commerce
 * flow.
 *
 * 1. Register a customer (join)
 * 2. Create a category (as admin)
 * 3. Create a product in the category (as admin)
 * 4. Customer adds order address snapshot
 * 5. Admin creates order payment method snapshot
 * 6. Customer creates an order (with address and payment)
 * 7. Customer posts a review for the product (after valid order)
 * 8. Customer flags the review for abuse/moderation
 * 9. Duplicate flag attempt by same customer is rejected
 * 10. Attempt to flag non-existent review should fail
 * 11. Unauthenticated/unauthorized user cannot flag
 */
export async function test_api_review_flag_create_by_customer(
  connection: api.IConnection,
) {
  // 1. Register customer
  const customerJoin = await api.functional.auth.customer.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      full_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      address: {
        recipient_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        region: RandomGenerator.paragraph({ sentences: 2 }),
        postal_code: RandomGenerator.alphaNumeric(5),
        address_line1: RandomGenerator.paragraph({ sentences: 2 }),
        address_line2: null,
        is_default: true,
      },
    },
  });
  typia.assert(customerJoin);
  const customerId = customerJoin.id;
  // 2. Create a new category (admin flow)
  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        parent_id: undefined,
        name_ko: RandomGenerator.name(2),
        name_en: RandomGenerator.name(2),
        description_ko: RandomGenerator.paragraph({ sentences: 2 }),
        description_en: RandomGenerator.paragraph({ sentences: 2 }),
        display_order: 0,
        is_active: true,
      },
    },
  );
  typia.assert(category);
  // 3. Create a new product in the category (admin flow)
  const product = await api.functional.shoppingMall.admin.products.create(
    connection,
    {
      body: {
        shopping_mall_seller_id: typia.random<string & tags.Format<"uuid">>(), // Random seller
        shopping_mall_category_id: category.id,
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        is_active: true,
        main_image_url: undefined,
      },
    },
  );
  typia.assert(product);
  // 4. Customer saves order address snapshot
  const orderAddress =
    await api.functional.shoppingMall.customer.orderAddresses.create(
      connection,
      {
        body: {
          address_type: "shipping",
          recipient_name: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          zip_code: RandomGenerator.alphaNumeric(6),
          address_main: RandomGenerator.paragraph({ sentences: 3 }),
          address_detail: RandomGenerator.paragraph({ sentences: 1 }),
          country_code: "KOR",
        },
      },
    );
  typia.assert(orderAddress);
  // 5. Admin creates order payment method snapshot
  const paymentMethod =
    await api.functional.shoppingMall.admin.orderPaymentMethods.create(
      connection,
      {
        body: {
          payment_method_type: "card",
          method_data: '{ "number": "****-****-****-1234" }',
          display_name: "Visa **** 1234",
        },
      },
    );
  typia.assert(paymentMethod);
  // 6. Customer creates an order
  const order = await api.functional.shoppingMall.customer.orders.create(
    connection,
    {
      body: {
        shipping_address_id: orderAddress.id,
        payment_method_id: paymentMethod.id,
        order_total: 10000,
        currency: "KRW",
      },
    },
  );
  typia.assert(order);
  // 7. Customer posts a review
  const review =
    await api.functional.shoppingMall.customer.products.reviews.create(
      connection,
      {
        productId: product.id,
        body: {
          shopping_mall_order_id: order.id,
          rating: 4,
          body: RandomGenerator.paragraph({ sentences: 12 }),
        },
      },
    );
  typia.assert(review);
  // 8. Customer flags the review
  const flagBody = {
    reason: "abuse",
    note: "Contains offensive language",
  } satisfies IShoppingMallReviewFlag.ICreate;
  const flag =
    await api.functional.shoppingMall.customer.products.reviews.flags.create(
      connection,
      {
        productId: product.id,
        reviewId: review.id,
        body: flagBody,
      },
    );
  typia.assert(flag);
  TestValidator.equals(
    "flag links to review",
    flag.shopping_mall_review_id,
    review.id,
  );
  // 9. Duplicate flag is rejected
  await TestValidator.error("duplicate flag attempt fails", async () => {
    await api.functional.shoppingMall.customer.products.reviews.flags.create(
      connection,
      {
        productId: product.id,
        reviewId: review.id,
        body: flagBody,
      },
    );
  });
  // 10. Non-existent review flag rejected
  const fakeId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("flagging non-existent review fails", async () => {
    await api.functional.shoppingMall.customer.products.reviews.flags.create(
      connection,
      {
        productId: product.id,
        reviewId: fakeId,
        body: flagBody,
      },
    );
  });
  // 11. Unauthenticated cannot flag (simulate by wiping token)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthorized user denied flagging", async () => {
    await api.functional.shoppingMall.customer.products.reviews.flags.create(
      unauthConn,
      {
        productId: product.id,
        reviewId: review.id,
        body: flagBody,
      },
    );
  });
}
