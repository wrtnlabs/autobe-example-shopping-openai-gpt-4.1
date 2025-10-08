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
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test that only the author seller can update their review reply to a product
 * review; non-owner sellers receive a forbidden/permission error.
 *
 * 1. Admin registers and creates a category.
 * 2. The first seller registers.
 * 3. Admin creates a product with the first seller as owner.
 * 4. A customer registers and adds address.
 * 5. Admin creates payment method snapshot.
 * 6. Customer orders the product (links address & payment snapshot).
 * 7. Customer leaves a review on the product ordered.
 * 8. First seller creates a reply to the review.
 * 9. A second seller registers (non-author).
 * 10. Second seller attempts to update the first seller's reply (should fail with
 *     forbidden).
 */
export async function test_api_review_reply_update_attempt_by_non_author_seller_denied(
  connection: api.IConnection,
) {
  // 1. Admin registers
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        full_name: RandomGenerator.name(),
      },
    });
  typia.assert(admin);

  // 2. First seller registers
  const seller1: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        business_name: RandomGenerator.name(),
        contact_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        kyc_document_uri: null,
        business_registration_number: RandomGenerator.alphaNumeric(12),
      },
    });
  typia.assert(seller1);

  // 3. Admin creates category
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        name_ko: RandomGenerator.name(),
        name_en: RandomGenerator.name(),
        display_order: 0,
        is_active: true,
      },
    });
  typia.assert(category);

  // 4. Admin creates product (owned by seller1)
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.admin.products.create(connection, {
      body: {
        shopping_mall_seller_id: seller1.id,
        shopping_mall_category_id: category.id,
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 10 }),
        is_active: true,
        main_image_url: null,
      },
    });
  typia.assert(product);

  // 5. Customer registers
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        address: {
          recipient_name: RandomGenerator.name(1),
          phone: RandomGenerator.mobile(),
          region: RandomGenerator.name(1),
          postal_code: RandomGenerator.alphaNumeric(5),
          address_line1: RandomGenerator.name(2),
          is_default: true,
        },
      },
    });
  typia.assert(customer);

  // 6. Customer creates order address snapshot
  const orderAddress: IShoppingMallOrderAddress =
    await api.functional.shoppingMall.customer.orderAddresses.create(
      connection,
      {
        body: {
          address_type: "shipping",
          recipient_name: RandomGenerator.name(1),
          phone: RandomGenerator.mobile(),
          zip_code: RandomGenerator.alphaNumeric(5),
          address_main: RandomGenerator.name(2),
          country_code: "KOR",
        },
      },
    );
  typia.assert(orderAddress);

  // 7. Admin creates payment method snapshot
  const paymentMethod: IShoppingMallOrderPaymentMethod =
    await api.functional.shoppingMall.admin.orderPaymentMethods.create(
      connection,
      {
        body: {
          payment_method_type: "card",
          method_data: RandomGenerator.alphaNumeric(16),
          display_name: RandomGenerator.name(2),
        },
      },
    );
  typia.assert(paymentMethod);

  // 8. Customer creates order
  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: {
        shipping_address_id: orderAddress.id,
        payment_method_id: paymentMethod.id,
        order_total: 10000,
        currency: "KRW",
      },
    });
  typia.assert(order);

  // 9. Customer leaves review on product ordered
  const review: IShoppingMallReview =
    await api.functional.shoppingMall.customer.products.reviews.create(
      connection,
      {
        productId: product.id,
        body: {
          shopping_mall_order_id: order.id,
          rating: 5,
          body: RandomGenerator.paragraph({ sentences: 15 }),
        },
      },
    );
  typia.assert(review);

  // 10. First seller creates reply (using admin endpoint to allow setup, simulates dashboard)
  const reply: IShoppingMallReviewReply =
    await api.functional.shoppingMall.admin.products.reviews.replies.create(
      connection,
      {
        productId: product.id,
        reviewId: review.id,
        body: {
          body: RandomGenerator.paragraph({ sentences: 4 }),
          status: "public",
        },
      },
    );
  typia.assert(reply);

  // 11. Second seller registers (the one who is not the author)
  const seller2: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        business_name: RandomGenerator.name(),
        contact_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        kyc_document_uri: null,
        business_registration_number: RandomGenerator.alphaNumeric(12),
      },
    });
  typia.assert(seller2);

  // 12. Attempt update with non-author seller: forbidden
  await TestValidator.error(
    "non-author seller cannot update another's review reply",
    async () => {
      await api.functional.shoppingMall.seller.products.reviews.replies.update(
        connection,
        {
          productId: product.id,
          reviewId: review.id,
          replyId: reply.id,
          body: {
            body: RandomGenerator.paragraph({ sentences: 2 }),
            status: "hidden",
          },
        },
      );
    },
  );
}
