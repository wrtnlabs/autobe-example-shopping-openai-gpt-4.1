import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReviewImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReviewImage";
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
 * Validate that review images are no longer available after the review is
 * soft-deleted.
 *
 * 1. Register a customer (and login, token is set by the SDK automatically)
 * 2. Create a category (admin)
 * 3. Create a product in that category (admin, but using randomly generated seller
 *    id or dummy value)
 * 4. Prepare a payment method snapshot (admin)
 * 5. Create a customer order address snapshot
 * 6. Place an order for the product as customer
 * 7. Write a review for the purchased product
 * 8. Attach images to that review
 * 9. Soft-delete (erase) the review
 * 10. Verify the public review-images index endpoint returns zero images (the
 *     images are hidden)
 */
export async function test_api_product_review_image_list_after_soft_delete(
  connection: api.IConnection,
) {
  // 1. Register customer
  const customerEmail: string = typia.random<string & tags.Format<"email">>();
  const customerPwd = RandomGenerator.alphaNumeric(12);
  const customerJoin = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: customerPwd,
      full_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      address: {
        recipient_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        region: RandomGenerator.paragraph({ sentences: 1 }),
        postal_code: RandomGenerator.alphaNumeric(5),
        address_line1: RandomGenerator.paragraph({ sentences: 2 }),
        address_line2: null,
        is_default: true,
      },
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerJoin);

  // 2. Create category (admin)
  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        parent_id: undefined,
        name_ko: RandomGenerator.paragraph({ sentences: 1 }),
        name_en: RandomGenerator.paragraph({ sentences: 1 }),
        display_order: 0,
        is_active: true,
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // 3. Create product (admin)
  const product = await api.functional.shoppingMall.admin.products.create(
    connection,
    {
      body: {
        shopping_mall_seller_id: typia.random<string & tags.Format<"uuid">>(),
        shopping_mall_category_id: category.id,
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        is_active: true,
        main_image_url: null,
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);

  // 4. Create payment method (admin)
  const paymentMethod =
    await api.functional.shoppingMall.admin.orderPaymentMethods.create(
      connection,
      {
        body: {
          payment_method_type: "card",
          method_data: '{"card_no":"1234-5678-9999-1234"}',
          display_name: "현대카드 ****1234",
        } satisfies IShoppingMallOrderPaymentMethod.ICreate,
      },
    );
  typia.assert(paymentMethod);

  // 5. Create order address (customer)
  const orderAddress =
    await api.functional.shoppingMall.customer.orderAddresses.create(
      connection,
      {
        body: {
          address_type: "shipping",
          recipient_name: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          zip_code: RandomGenerator.alphaNumeric(5),
          address_main: RandomGenerator.paragraph({ sentences: 2 }),
          address_detail: null,
          country_code: "KOR",
        } satisfies IShoppingMallOrderAddress.ICreate,
      },
    );
  typia.assert(orderAddress);

  // 6. Place order (customer)
  const orderTotal = 10000;
  const order = await api.functional.shoppingMall.customer.orders.create(
    connection,
    {
      body: {
        shipping_address_id: orderAddress.id,
        payment_method_id: paymentMethod.id,
        order_total: orderTotal,
        currency: "KRW",
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order);

  // 7. Write review
  const rating = 5;
  const review =
    await api.functional.shoppingMall.customer.products.reviews.create(
      connection,
      {
        productId: product.id,
        body: {
          shopping_mall_order_id: order.id,
          rating: rating,
          body: RandomGenerator.content({ paragraphs: 1, sentenceMin: 10 }),
        } satisfies IShoppingMallReview.ICreate,
      },
    );
  typia.assert(review);

  // 8. Attach images (one or more)
  const image1 =
    await api.functional.shoppingMall.customer.products.reviews.images.create(
      connection,
      {
        productId: product.id,
        reviewId: review.id,
        body: {
          image_uri:
            "https://cdn.example.com/images/" +
            RandomGenerator.alphaNumeric(16) +
            ".jpg",
        } satisfies IShoppingMallReviewImage.ICreate,
      },
    );
  typia.assert(image1);

  const image2 =
    await api.functional.shoppingMall.customer.products.reviews.images.create(
      connection,
      {
        productId: product.id,
        reviewId: review.id,
        body: {
          image_uri:
            "https://cdn.example.com/images/" +
            RandomGenerator.alphaNumeric(16) +
            ".png",
        } satisfies IShoppingMallReviewImage.ICreate,
      },
    );
  typia.assert(image2);

  // 9. Soft-delete the review
  await api.functional.shoppingMall.customer.products.reviews.erase(
    connection,
    {
      productId: product.id,
      reviewId: review.id,
    },
  );

  // 10. Query public review image list endpoint
  const imagePage =
    await api.functional.shoppingMall.products.reviews.images.index(
      connection,
      {
        productId: product.id,
        reviewId: review.id,
      },
    );
  typia.assert(imagePage);

  // 11. Assert no images are returned (all are now hidden due to soft-delete review)
  TestValidator.equals(
    "list of public review images should be empty after soft-delete",
    imagePage.data.length,
    0,
  );
}
