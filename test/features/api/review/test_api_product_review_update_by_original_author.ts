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

/**
 * Validate customer review update workflow and authorization.
 *
 * 1. Register admin and create a category.
 * 2. Register customer A with address, then login as that customer.
 * 3. Create a payment method as admin.
 * 4. Create a product assigned to the admin and the category.
 * 5. Create order address (address snapshot) for the customer.
 * 6. Place order for that product as the customer with order address and payment
 *    snapshot.
 * 7. Post an initial review for the purchased product as the customer.
 * 8. Successfully update the review as "original author" and verify change and
 *    reset moderation status (if any).
 * 9. Attempt to update review with invalid rating or too-short review body,
 *    confirm business rule enforcement.
 * 10. Register second customer B and attempt to update A's review (should fail with
 *     forbidden).
 * 11. (Simulate soft-delete) -- not available via current APIs, so skipped or
 *     commented.
 */
export async function test_api_product_review_update_by_original_author(
  connection: api.IConnection,
) {
  // 1. Register admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "1234abcd",
        full_name: RandomGenerator.name(),
        status: "active",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Create category
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        parent_id: undefined,
        name_ko: RandomGenerator.paragraph({ sentences: 2 }),
        name_en: RandomGenerator.paragraph({ sentences: 2 }),
        description_ko: RandomGenerator.paragraph({ sentences: 4 }),
        description_en: RandomGenerator.paragraph({ sentences: 4 }),
        display_order: 0,
        is_active: true,
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(category);

  // 3. Register customer A
  const customerAEmail = typia.random<string & tags.Format<"email">>();
  const addressBody = {
    recipient_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    region: RandomGenerator.paragraph({ sentences: 1 }),
    postal_code: RandomGenerator.alphaNumeric(5),
    address_line1: RandomGenerator.paragraph({ sentences: 2 }),
    address_line2: undefined,
    is_default: true,
  } satisfies IShoppingMallCustomerAddress.ICreate;
  const joinA: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerAEmail,
        password: "user123456",
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        address: addressBody,
      } satisfies IShoppingMallCustomer.IJoin,
    });
  typia.assert(joinA);

  // 4. Create order address (snapshot for the order)
  const orderAddress: IShoppingMallOrderAddress =
    await api.functional.shoppingMall.customer.orderAddresses.create(
      connection,
      {
        body: {
          address_type: "shipping",
          recipient_name: addressBody.recipient_name,
          phone: addressBody.phone,
          zip_code: addressBody.postal_code,
          address_main: addressBody.address_line1,
          address_detail: addressBody.address_line2,
          country_code: "KOR",
        } satisfies IShoppingMallOrderAddress.ICreate,
      },
    );
  typia.assert(orderAddress);

  // 5. Create payment method
  const paymentMethod: IShoppingMallOrderPaymentMethod =
    await api.functional.shoppingMall.admin.orderPaymentMethods.create(
      connection,
      {
        body: {
          payment_method_type: "card",
          method_data: '{"masked": "****-****-****-1234"}',
          display_name: "Visa **** 1234",
        } satisfies IShoppingMallOrderPaymentMethod.ICreate,
      },
    );
  typia.assert(paymentMethod);

  // 6. Create product (assigned to admin)
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.admin.products.create(connection, {
      body: {
        shopping_mall_seller_id: admin.id,
        shopping_mall_category_id: category.id,
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 8 }),
        is_active: true,
        main_image_url: null,
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(product);

  // 7. Place order for product as customer A
  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: {
        shipping_address_id: orderAddress.id,
        payment_method_id: paymentMethod.id,
        order_total: 10000,
        currency: "KRW",
      } satisfies IShoppingMallOrder.ICreate,
    });
  typia.assert(order);

  // 8. Post a review as customer A
  const review: IShoppingMallReview =
    await api.functional.shoppingMall.customer.products.reviews.create(
      connection,
      {
        productId: product.id,
        body: {
          shopping_mall_order_id: order.id,
          rating: 5,
          body: RandomGenerator.paragraph({ sentences: 4 }),
        } satisfies IShoppingMallReview.ICreate,
      },
    );
  typia.assert(review);

  // 9. Update review as author: valid change
  const updateInput = {
    rating: 3,
    body: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies IShoppingMallReview.IUpdate;
  const updated: IShoppingMallReview =
    await api.functional.shoppingMall.customer.products.reviews.update(
      connection,
      {
        productId: product.id,
        reviewId: review.id,
        body: updateInput,
      },
    );
  typia.assert(updated);
  TestValidator.notEquals(
    "review updated timestamp increments",
    updated.updated_at,
    review.updated_at,
  );
  TestValidator.notEquals(
    "review body should have changed",
    updated.body,
    review.body,
  );

  // 10. Attempt update with invalid rating
  await TestValidator.error("rating below minimum fails", async () => {
    await api.functional.shoppingMall.customer.products.reviews.update(
      connection,
      {
        productId: product.id,
        reviewId: review.id,
        body: { rating: 0 } satisfies IShoppingMallReview.IUpdate,
      },
    );
  });

  await TestValidator.error("rating above maximum fails", async () => {
    await api.functional.shoppingMall.customer.products.reviews.update(
      connection,
      {
        productId: product.id,
        reviewId: review.id,
        body: { rating: 6 } satisfies IShoppingMallReview.IUpdate,
      },
    );
  });

  await TestValidator.error("too short body fails", async () => {
    await api.functional.shoppingMall.customer.products.reviews.update(
      connection,
      {
        productId: product.id,
        reviewId: review.id,
        body: { body: "Too short" } satisfies IShoppingMallReview.IUpdate,
      },
    );
  });

  // 11. Register customer B and attempt unauthorized update (should fail)
  const customerBEmail = typia.random<string & tags.Format<"email">>();
  const addressBodyB = {
    recipient_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    region: RandomGenerator.paragraph({ sentences: 1 }),
    postal_code: RandomGenerator.alphaNumeric(5),
    address_line1: RandomGenerator.paragraph({ sentences: 2 }),
    address_line2: undefined,
    is_default: true,
  } satisfies IShoppingMallCustomerAddress.ICreate;
  await api.functional.auth.customer.join(connection, {
    body: {
      email: customerBEmail,
      password: "user654321",
      full_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      address: addressBodyB,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  await TestValidator.error(
    "another customer cannot update someone else's review",
    async () => {
      await api.functional.shoppingMall.customer.products.reviews.update(
        connection,
        {
          productId: product.id,
          reviewId: review.id,
          body: updateInput,
        },
      );
    },
  );

  // (12) Soft-deletion attempt not possible via exposed API: skip.
}
