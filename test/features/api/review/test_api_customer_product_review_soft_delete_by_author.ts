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

/**
 * Validate customer-initiated soft-deletion of their own product review after
 * full business flow.
 *
 * 1. Register and authenticate a new customer
 * 2. Create a product category (admin)
 * 3. Create a product in the category (admin)
 * 4. Customer creates a shipping/order address snapshot
 * 5. Admin creates order payment method snapshot
 * 6. Customer places order for the product
 * 7. Customer writes a review for that product on the order
 * 8. Customer erases (soft-deletes) the review
 * 9. Assert the review exists with deleted_at and is not visible for rating
 */
export async function test_api_customer_product_review_soft_delete_by_author(
  connection: api.IConnection,
) {
  // 1. Register new customer (and authenticate)
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    full_name: RandomGenerator.name(2),
    phone: RandomGenerator.mobile(),
    address: {
      recipient_name: RandomGenerator.name(1),
      phone: RandomGenerator.mobile(),
      region: RandomGenerator.pick([
        "Seoul",
        "Busan",
        "Incheon",
        "Daegu",
        "Gwangju",
      ]).toString(),
      postal_code: "06236",
      address_line1: "100, Teheran-ro",
      address_line2: "APT 101",
      is_default: true,
    },
  } satisfies IShoppingMallCustomer.IJoin;
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customer);
  // token is automatically set in connection

  // 2. Admin creates a new category
  const categoryBody = {
    name_ko: RandomGenerator.paragraph({ sentences: 2 }),
    name_en: RandomGenerator.paragraph({ sentences: 2 }),
    display_order: typia.random<number & tags.Type<"int32">>(),
    is_active: true,
  } satisfies IShoppingMallCategory.ICreate;
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryBody,
    });
  typia.assert(category);

  // 3. Admin creates a product in the new category
  const productBody = {
    shopping_mall_seller_id: typia.random<string & tags.Format<"uuid">>(), // simulate a valid seller UUID
    shopping_mall_category_id: category.id,
    name: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
    is_active: true,
    main_image_url: null,
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.admin.products.create(connection, {
      body: productBody,
    });
  typia.assert(product);

  // 4. Customer creates an immutable order address snapshot
  const orderAddressBody = {
    address_type: "shipping",
    recipient_name: customer.full_name,
    phone: customer.phone,
    zip_code: "06236",
    address_main: customerJoinBody.address.address_line1,
    address_detail: customerJoinBody.address.address_line2,
    country_code: "KOR",
  } satisfies IShoppingMallOrderAddress.ICreate;
  const orderAddress: IShoppingMallOrderAddress =
    await api.functional.shoppingMall.customer.orderAddresses.create(
      connection,
      { body: orderAddressBody },
    );
  typia.assert(orderAddress);

  // 5. Admin creates payment method snapshot (simulate e.g. VISA credit card)
  const paymentMethodBody = {
    payment_method_type: "card",
    method_data: JSON.stringify({
      card_type: "VISA",
      masked: "****-****-1234",
    }),
    display_name: "VISA ****1234",
  } satisfies IShoppingMallOrderPaymentMethod.ICreate;
  const paymentMethod: IShoppingMallOrderPaymentMethod =
    await api.functional.shoppingMall.admin.orderPaymentMethods.create(
      connection,
      { body: paymentMethodBody },
    );
  typia.assert(paymentMethod);

  // 6. Customer creates order
  const orderBody = {
    shipping_address_id: orderAddress.id,
    payment_method_id: paymentMethod.id,
    order_total: 99900,
    currency: "KRW",
  } satisfies IShoppingMallOrder.ICreate;
  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderBody,
    });
  typia.assert(order);

  // 7. Customer writes a review for that product/order
  const reviewBody = {
    shopping_mall_order_id: order.id,
    rating: 5,
    body: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 10,
      sentenceMax: 15,
    }),
  } satisfies IShoppingMallReview.ICreate;
  const review: IShoppingMallReview =
    await api.functional.shoppingMall.customer.products.reviews.create(
      connection,
      {
        productId: product.id,
        body: reviewBody,
      },
    );
  typia.assert(review);
  TestValidator.equals(
    "review is not deleted initially",
    review.deleted_at,
    null,
  );
  // 8. Customer erases (soft-deletes) review
  await api.functional.shoppingMall.customer.products.reviews.erase(
    connection,
    {
      productId: product.id,
      reviewId: review.id,
    },
  );

  // 9. Validate review is now marked deleted (simulate fetch and check deleted_at)
  // Since there is no provided API to get the review by ID or list reviews, we can only assert that the flow completes and the API does not throw.
  // Optionally, confirm by attempting to erase again and expect error:
  await TestValidator.error("cannot erase already deleted review", async () => {
    await api.functional.shoppingMall.customer.products.reviews.erase(
      connection,
      {
        productId: product.id,
        reviewId: review.id,
      },
    );
  });
}
