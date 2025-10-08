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
import type { IShoppingMallReviewImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewImage";

/**
 * Test the full workflow for a customer to delete an image attached to their
 * own product review.
 *
 * 1. Admin registers
 * 2. Admin creates a category
 * 3. Admin creates a product in that category
 * 4. Customer registers
 * 5. Customer creates a shipping address snapshot
 * 6. Admin creates a payment method snapshot
 * 7. Customer places an order for the product
 * 8. Customer submits a review for the product
 * 9. Customer attaches an image to the review
 * 10. Customer deletes the attached image via the API
 * 11. Verifies image deletion by attempting to delete again (expects error)
 * 12. Attempts deletion as a different customer (expects error) (Moderation lock
 *     scenario is skipped as out of API reach.)
 */
export async function test_api_review_image_deletion_by_author(
  connection: api.IConnection,
) {
  // 1. Admin registers
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    full_name: RandomGenerator.name(),
  } satisfies IShoppingMallAdmin.ICreate;
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);
  // 2. Admin creates a category
  const categoryBody = {
    name_ko: RandomGenerator.name(),
    name_en: RandomGenerator.name(),
    display_order: 0,
    is_active: true,
  } satisfies IShoppingMallCategory.ICreate;
  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: categoryBody,
    },
  );
  typia.assert(category);
  // 3. Admin creates a product in that category
  const productBody = {
    shopping_mall_seller_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_category_id: category.id,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
    is_active: true,
  } satisfies IShoppingMallProduct.ICreate;
  const product = await api.functional.shoppingMall.admin.products.create(
    connection,
    {
      body: productBody,
    },
  );
  typia.assert(product);
  // 4. Customer registers
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    address: {
      recipient_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      region: "Seoul",
      postal_code: "12345",
      address_line1: "123 Main St",
      is_default: true,
    },
  } satisfies IShoppingMallCustomer.IJoin;
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customer);
  // 5. Customer creates a shipping address snapshot
  const orderAddressBody = {
    address_type: "shipping",
    recipient_name: customer.full_name,
    phone: customer.phone,
    zip_code: "12345",
    address_main: "123 Main St",
    country_code: "KOR",
  } satisfies IShoppingMallOrderAddress.ICreate;
  const orderAddress =
    await api.functional.shoppingMall.customer.orderAddresses.create(
      connection,
      {
        body: orderAddressBody,
      },
    );
  typia.assert(orderAddress);
  // 6. Admin creates a payment method snapshot
  const paymentMethodBody = {
    payment_method_type: "card",
    method_data: '{"type":"visa","masked":"****4242"}',
    display_name: "Visa ****4242",
  } satisfies IShoppingMallOrderPaymentMethod.ICreate;
  const paymentMethod =
    await api.functional.shoppingMall.admin.orderPaymentMethods.create(
      connection,
      {
        body: paymentMethodBody,
      },
    );
  typia.assert(paymentMethod);
  // 7. Customer places a new order for the product
  const orderBody = {
    shipping_address_id: orderAddress.id,
    payment_method_id: paymentMethod.id,
    order_total: 35000,
    currency: "KRW",
  } satisfies IShoppingMallOrder.ICreate;
  const order = await api.functional.shoppingMall.customer.orders.create(
    connection,
    {
      body: orderBody,
    },
  );
  typia.assert(order);
  // 8. Customer submits new review for product
  const reviewBody = {
    shopping_mall_order_id: order.id,
    rating: 5,
    body: RandomGenerator.paragraph({ sentences: 10 }),
  } satisfies IShoppingMallReview.ICreate;
  const review =
    await api.functional.shoppingMall.customer.products.reviews.create(
      connection,
      {
        productId: product.id,
        body: reviewBody,
      },
    );
  typia.assert(review);
  // 9. Customer attaches an image to the review
  const imageBody = {
    image_uri:
      "https://cdn.example.com/images/" +
      RandomGenerator.alphaNumeric(12) +
      ".jpg",
  } satisfies IShoppingMallReviewImage.ICreate;
  const reviewImage =
    await api.functional.shoppingMall.customer.products.reviews.images.create(
      connection,
      {
        productId: product.id,
        reviewId: review.id,
        body: imageBody,
      },
    );
  typia.assert(reviewImage);
  // 10. Customer deletes the image via API
  await api.functional.shoppingMall.customer.products.reviews.images.erase(
    connection,
    {
      productId: product.id,
      reviewId: review.id,
      imageId: reviewImage.id,
    },
  );
  // 11. Attempt to delete again should fail
  await TestValidator.error("Deleting image twice fails", async () => {
    await api.functional.shoppingMall.customer.products.reviews.images.erase(
      connection,
      {
        productId: product.id,
        reviewId: review.id,
        imageId: reviewImage.id,
      },
    );
  });
  // 12. Register a second customer and attempt to delete as non-author (should fail)
  const customer2JoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    address: {
      recipient_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      region: "Seoul",
      postal_code: "54321",
      address_line1: "456 Market St",
      is_default: true,
    },
  } satisfies IShoppingMallCustomer.IJoin;
  const customer2: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customer2JoinBody,
    });
  typia.assert(customer2);
  await TestValidator.error(
    "Non-author cannot delete review image",
    async () => {
      await api.functional.shoppingMall.customer.products.reviews.images.erase(
        connection,
        {
          productId: product.id,
          reviewId: review.id,
          imageId: reviewImage.id,
        },
      );
    },
  );
}
