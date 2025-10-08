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
import type { IShoppingMallReviewImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewImage";

/**
 * Validate that a public user may retrieve a product review image by its ID
 * without authentication.
 *
 * Workflow:
 *
 * 1. Admin creates a product category
 * 2. Admin creates a product in that category
 * 3. Customer registers
 * 4. Customer creates order address snapshot
 * 5. Admin creates payment method snapshot
 * 6. Customer places order (assigns address/payment method, price/currency)
 * 7. Customer writes a product review (references purchased order)
 * 8. Customer attaches an image to the review using image_uri
 * 9. Public (no auth) GET retrieves the review image by productId, reviewId,
 *    imageId.
 *
 * Validation:
 *
 * - Response contains valid id, shopping_mall_review_id, image_uri, and
 *   created_at.
 * - Shopping_mall_review_id matches reviewId used for association.
 * - No soft-deleted (deleted_at != null) images appear
 * - On non-existent or wrong association (wrong ids), response is not-found
 *   error.
 */
export async function test_api_review_image_retrieval_by_public_user(
  connection: api.IConnection,
) {
  // 1. Admin creates a category
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        name_ko: RandomGenerator.name(2),
        name_en: RandomGenerator.name(2),
        display_order: 0,
        is_active: true,
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(category);

  // 2. Admin creates a product for some (dummy) seller
  // (Use a random UUID for shopping_mall_seller_id for test; assume valid seller exists for admin-created products)
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.admin.products.create(connection, {
      body: {
        shopping_mall_seller_id: typia.random<string & tags.Format<"uuid">>(),
        shopping_mall_category_id: category.id,
        name: RandomGenerator.name(2),
        description: RandomGenerator.content({ paragraphs: 2 }),
        is_active: true,
        main_image_url: null,
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(product);

  // 3. Customer registers
  const customerInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    address: {
      recipient_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      region: "Seoul",
      postal_code: "04501",
      address_line1: "101 Test Road",
      address_line2: "Room 202",
      is_default: true,
    },
  } satisfies IShoppingMallCustomer.IJoin;
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerInput,
    });
  typia.assert(customer);

  // 4. Customer creates order address snapshot
  const orderAddressInput = {
    address_type: "shipping",
    recipient_name: customerInput.full_name,
    phone: customerInput.phone,
    zip_code: customerInput.address.postal_code || "04501",
    address_main: customerInput.address.address_line1,
    address_detail: customerInput.address.address_line2,
    country_code: "KOR",
  } satisfies IShoppingMallOrderAddress.ICreate;
  const orderAddress: IShoppingMallOrderAddress =
    await api.functional.shoppingMall.customer.orderAddresses.create(
      connection,
      { body: orderAddressInput },
    );
  typia.assert(orderAddress);

  // 5. Admin creates payment method snapshot
  const paymentMethodInput = {
    payment_method_type: "card",
    method_data: '{"provider":"VISA","number":"****-1234"}',
    display_name: "VISA ****-1234",
  } satisfies IShoppingMallOrderPaymentMethod.ICreate;
  const paymentMethod: IShoppingMallOrderPaymentMethod =
    await api.functional.shoppingMall.admin.orderPaymentMethods.create(
      connection,
      { body: paymentMethodInput },
    );
  typia.assert(paymentMethod);

  // 6. Customer places order
  const orderInput = {
    shipping_address_id: orderAddress.id,
    payment_method_id: paymentMethod.id,
    order_total: 10000,
    currency: "KRW",
  } satisfies IShoppingMallOrder.ICreate;
  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderInput,
    });
  typia.assert(order);

  // 7. Customer writes review for product (references purchase order)
  const reviewInput = {
    shopping_mall_order_id: order.id,
    rating: 5,
    body: RandomGenerator.content({ paragraphs: 1 }),
  } satisfies IShoppingMallReview.ICreate;
  const review: IShoppingMallReview =
    await api.functional.shoppingMall.customer.products.reviews.create(
      connection,
      {
        productId: product.id,
        body: reviewInput,
      },
    );
  typia.assert(review);

  // 8. Customer attaches an image to the review
  const reviewImageInput = {
    image_uri: `https://test.cdn.example.com/review/${review.id}/${RandomGenerator.alphaNumeric(10)}.jpg`,
  } satisfies IShoppingMallReviewImage.ICreate;
  const reviewImage: IShoppingMallReviewImage =
    await api.functional.shoppingMall.customer.products.reviews.images.create(
      connection,
      {
        productId: product.id,
        reviewId: review.id,
        body: reviewImageInput,
      },
    );
  typia.assert(reviewImage);

  // 9. Public GET retrieves the review image by productId/reviewId/imageId
  // Create fresh connection for public (no auth header)
  const publicConnection: api.IConnection = { ...connection, headers: {} };
  const foundImage: IShoppingMallReviewImage =
    await api.functional.shoppingMall.products.reviews.images.at(
      publicConnection,
      {
        productId: product.id,
        reviewId: review.id,
        imageId: reviewImage.id,
      },
    );
  typia.assert(foundImage);
  TestValidator.equals("found image id matches", foundImage.id, reviewImage.id);
  TestValidator.equals(
    "found image review association",
    foundImage.shopping_mall_review_id,
    review.id,
  );
  TestValidator.equals(
    "found image URI matches",
    foundImage.image_uri,
    reviewImageInput.image_uri,
  );

  // Not-found: wrong product, right review, right image
  await TestValidator.error("not-found for wrong productId", async () => {
    await api.functional.shoppingMall.products.reviews.images.at(
      publicConnection,
      {
        productId: typia.random<string & tags.Format<"uuid">>(),
        reviewId: review.id,
        imageId: reviewImage.id,
      },
    );
  });

  // Not-found: right product, wrong review, right image
  await TestValidator.error("not-found for wrong reviewId", async () => {
    await api.functional.shoppingMall.products.reviews.images.at(
      publicConnection,
      {
        productId: product.id,
        reviewId: typia.random<string & tags.Format<"uuid">>(),
        imageId: reviewImage.id,
      },
    );
  });

  // Not-found: right product, right review, wrong image
  await TestValidator.error("not-found for wrong imageId", async () => {
    await api.functional.shoppingMall.products.reviews.images.at(
      publicConnection,
      {
        productId: product.id,
        reviewId: review.id,
        imageId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  });
}
