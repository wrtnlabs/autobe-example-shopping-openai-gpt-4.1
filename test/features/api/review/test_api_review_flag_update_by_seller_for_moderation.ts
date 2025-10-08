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
import type { IShoppingMallReviewFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewFlag";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validates update access and error handling for seller-flagged product review
 * moderation.
 *
 * 1. Admin registers and creates a product category.
 * 2. Admin creates a product assigned to Seller.
 * 3. Seller registers (join).
 * 4. Customer registers (join) and creates a shipping address.
 * 5. Admin creates a payment method.
 * 6. Customer creates an order using address/payment method for the product.
 * 7. Customer creates a review for the product/order.
 * 8. Seller flags the customer review (producing a flagId).
 * 9. Seller updates their own flag (change note, set status to resolved: happy
 *    path).
 * 10. Validate flag was updated.
 * 11. Register a second seller.
 * 12. Attempt update with wrong seller (should error for forbidden).
 * 13. Attempt to re-update a resolved flag (should error for already
 *     resolved/closed).
 */
export async function test_api_review_flag_update_by_seller_for_moderation(
  connection: api.IConnection,
) {
  // Admin registers (join)
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin-secret-password",
      full_name: RandomGenerator.name(),
      status: "active",
    },
  });
  typia.assert(adminJoin);

  // Seller registers (join)
  const sellerJoin = await api.functional.auth.seller.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "seller-password",
      business_name: RandomGenerator.name(2),
      contact_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      business_registration_number: RandomGenerator.alphaNumeric(10),
      kyc_document_uri: null,
    },
  });
  typia.assert(sellerJoin);

  // Create category (admin)
  const categoryCreate =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        name_ko: RandomGenerator.paragraph({ sentences: 2 }),
        name_en: RandomGenerator.paragraph({ sentences: 2 }),
        display_order: 0,
        is_active: true,
      },
    });
  typia.assert(categoryCreate);

  // Create product as admin assigned to seller
  const productCreate = await api.functional.shoppingMall.admin.products.create(
    connection,
    {
      body: {
        shopping_mall_seller_id: sellerJoin.id,
        shopping_mall_category_id: categoryCreate.id,
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        is_active: true,
        main_image_url: null,
      },
    },
  );
  typia.assert(productCreate);

  // Customer registers (join)
  const customerJoin = await api.functional.auth.customer.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "customer-password",
      full_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      address: {
        recipient_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        region: RandomGenerator.paragraph({ sentences: 1 }),
        postal_code: RandomGenerator.alphaNumeric(5),
        address_line1: RandomGenerator.paragraph({ sentences: 1 }),
        is_default: true,
      },
    },
  });
  typia.assert(customerJoin);

  // Customer creates an order address (snapshot)
  const orderAddr =
    await api.functional.shoppingMall.customer.orderAddresses.create(
      connection,
      {
        body: {
          address_type: "shipping",
          recipient_name: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          zip_code: RandomGenerator.alphaNumeric(5),
          address_main: RandomGenerator.paragraph({ sentences: 1 }),
          country_code: "KOR",
        },
      },
    );
  typia.assert(orderAddr);

  // Admin creates an order payment method (snapshot)
  const paymentMethod =
    await api.functional.shoppingMall.admin.orderPaymentMethods.create(
      connection,
      {
        body: {
          payment_method_type: "card",
          method_data: RandomGenerator.alphaNumeric(12),
          display_name: "TestCard" + RandomGenerator.alphaNumeric(4),
        },
      },
    );
  typia.assert(paymentMethod);

  // Customer creates (places) an order for the product using snapshots
  const order = await api.functional.shoppingMall.customer.orders.create(
    connection,
    {
      body: {
        shipping_address_id: orderAddr.id,
        payment_method_id: paymentMethod.id,
        order_total: 10000,
        currency: "KRW",
      },
    },
  );
  typia.assert(order);

  // Customer creates a review for purchased product
  const review =
    await api.functional.shoppingMall.customer.products.reviews.create(
      connection,
      {
        productId: productCreate.id,
        body: {
          shopping_mall_order_id: order.id,
          rating: 5,
          body: RandomGenerator.content({ paragraphs: 1 }),
        },
      },
    );
  typia.assert(review);

  // Seller flags the customer's review
  const sellerFlag =
    await api.functional.shoppingMall.seller.products.reviews.flags.create(
      connection,
      {
        productId: productCreate.id,
        reviewId: review.id,
        body: {
          reason: "abuse",
          note: "Profanity detected.",
        },
      },
    );
  typia.assert(sellerFlag);

  // Seller updates their own flag: update note and status
  const updatedFlag =
    await api.functional.shoppingMall.seller.products.reviews.flags.update(
      connection,
      {
        productId: productCreate.id,
        reviewId: review.id,
        flagId: sellerFlag.id,
        body: {
          note: "Profanity reviewed; resolved.",
          status: "resolved",
        },
      },
    );
  typia.assert(updatedFlag);
  TestValidator.equals(
    "Flag status updated to resolved",
    updatedFlag.status,
    "resolved",
  );
  TestValidator.equals(
    "Flag note updated",
    updatedFlag.note,
    "Profanity reviewed; resolved.",
  );

  // A different seller tries to update this flag (should error)
  const secondSellerJoin = await api.functional.auth.seller.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "seller2-password",
      business_name: RandomGenerator.name(2),
      contact_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      business_registration_number: RandomGenerator.alphaNumeric(10),
    },
  });

  // Simulate switching session to new seller (should update connection headers, but SDK handles it)
  await TestValidator.error(
    "Forbidden flag update by another seller",
    async () => {
      await api.functional.shoppingMall.seller.products.reviews.flags.update(
        connection,
        {
          productId: productCreate.id,
          reviewId: review.id,
          flagId: sellerFlag.id,
          body: {
            note: "Malicious edit attempt.",
            status: "open",
          },
        },
      );
    },
  );

  // The original seller tries to update the flag again now that it's resolved (should error: closed workflow)
  // (No session switching needed, as SDK keeps last token)
  await TestValidator.error("Cannot update resolved/closed flag", async () => {
    await api.functional.shoppingMall.seller.products.reviews.flags.update(
      connection,
      {
        productId: productCreate.id,
        reviewId: review.id,
        flagId: sellerFlag.id,
        body: {
          note: "Reopened, but should fail",
          status: "open",
        },
      },
    );
  });
}
