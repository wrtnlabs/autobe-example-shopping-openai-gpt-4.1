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
 * Test: Customer review image upload limitation and error cases.
 *
 * This test covers the following steps:
 *
 * 1. Create a category as admin for the product.
 * 2. Create a new product and assign to the category (admin).
 * 3. Register a customer (auth join) with an initial address.
 * 4. Create a shipping address snapshot for the order (customer).
 * 5. Create an order payment method snapshot (admin, for test purposes).
 * 6. Place an order using the shipping address and payment method (customer).
 * 7. Submit a review for the purchased product as the customer.
 * 8. Upload 5 images to the review (success; upper bound).
 * 9. Attempt to add a 6th image (should fail: platform max 5 images per review).
 * 10. Attempt to upload an image for a different/nonexistent review (should fail).
 * 11. Attempt to upload a review image as another (non-authorized) customer (should
 *     fail).
 */
export async function test_api_review_image_creation_by_review_author_customer(
  connection: api.IConnection,
) {
  // Step 1: Create category as admin
  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        name_ko: RandomGenerator.paragraph({ sentences: 2 }),
        name_en: RandomGenerator.paragraph({ sentences: 2 }),
        display_order: typia.random<number & tags.Type<"int32">>(),
        is_active: true,
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // Step 2: Create product (admin)
  const product = await api.functional.shoppingMall.admin.products.create(
    connection,
    {
      body: {
        shopping_mall_seller_id: typia.random<string & tags.Format<"uuid">>(),
        shopping_mall_category_id: category.id,
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        is_active: true,
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);

  // Step 3: Register customer
  const customerEmail = `test+${RandomGenerator.alphaNumeric(8)}@test.com`;
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: RandomGenerator.alphaNumeric(12),
      full_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      address: {
        recipient_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        region: RandomGenerator.name(),
        postal_code: RandomGenerator.alphaNumeric(5),
        address_line1: RandomGenerator.paragraph({ sentences: 3 }),
        is_default: true,
      },
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer);

  // Step 4: Create order address snapshot (customer)
  const orderAddress =
    await api.functional.shoppingMall.customer.orderAddresses.create(
      connection,
      {
        body: {
          address_type: "shipping",
          recipient_name: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          zip_code: RandomGenerator.alphaNumeric(5),
          address_main: RandomGenerator.paragraph({ sentences: 3 }),
          country_code: "KOR",
        } satisfies IShoppingMallOrderAddress.ICreate,
      },
    );
  typia.assert(orderAddress);

  // Step 5: Create payment method snapshot (admin, for test)
  const payMethod =
    await api.functional.shoppingMall.admin.orderPaymentMethods.create(
      connection,
      {
        body: {
          payment_method_type: "card",
          method_data: RandomGenerator.alphaNumeric(12),
          display_name: `Visa ****${RandomGenerator.alphaNumeric(4)}`,
        } satisfies IShoppingMallOrderPaymentMethod.ICreate,
      },
    );
  typia.assert(payMethod);

  // Step 6: Place order (customer)
  const order = await api.functional.shoppingMall.customer.orders.create(
    connection,
    {
      body: {
        shipping_address_id: orderAddress.id,
        payment_method_id: payMethod.id,
        order_total: 10000,
        currency: "KRW",
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order);

  // Step 7: Submit a review for product (customer)
  const review =
    await api.functional.shoppingMall.customer.products.reviews.create(
      connection,
      {
        productId: product.id,
        body: {
          shopping_mall_order_id: order.id,
          rating: 5,
          body: RandomGenerator.paragraph({ sentences: 10 }),
        } satisfies IShoppingMallReview.ICreate,
      },
    );
  typia.assert(review);

  // Step 8: Upload up to platform max (5 images)
  const imageURIs = ArrayUtil.repeat(
    5,
    () => `https://cdn.test.com/review/${RandomGenerator.alphaNumeric(8)}.jpg`,
  );
  const reviewImages: IShoppingMallReviewImage[] = [];
  for (const uri of imageURIs) {
    const img =
      await api.functional.shoppingMall.customer.products.reviews.images.create(
        connection,
        {
          productId: product.id,
          reviewId: review.id,
          body: { image_uri: uri } satisfies IShoppingMallReviewImage.ICreate,
        },
      );
    typia.assert(img);
    reviewImages.push(img);
    TestValidator.equals(
      "review image parent review",
      img.shopping_mall_review_id,
      review.id,
    );
    TestValidator.equals("review image uri", img.image_uri, uri);
  }

  // Step 9: Attempt to upload 6th image (should be rejected)
  await TestValidator.error("6th image exceeds max for review", async () => {
    await api.functional.shoppingMall.customer.products.reviews.images.create(
      connection,
      {
        productId: product.id,
        reviewId: review.id,
        body: {
          image_uri: `https://cdn.test.com/review/${RandomGenerator.alphaNumeric(10)}.jpg`,
        },
      },
    );
  });

  // Step 10: Upload for non-existent review (should be rejected)
  const fakeReviewId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "upload image for non-existent review fails",
    async () => {
      await api.functional.shoppingMall.customer.products.reviews.images.create(
        connection,
        {
          productId: product.id,
          reviewId: fakeReviewId,
          body: {
            image_uri: `https://cdn.test.com/review/${RandomGenerator.alphaNumeric(8)}.jpg`,
          },
        },
      );
    },
  );

  // Step 11: Attempt upload as another customer (non-author, should fail)
  const stranger = await api.functional.auth.customer.join(connection, {
    body: {
      email: `stranger+${RandomGenerator.alphaNumeric(8)}@test.com`,
      password: RandomGenerator.alphaNumeric(12),
      full_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      address: {
        recipient_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        region: RandomGenerator.name(),
        postal_code: RandomGenerator.alphaNumeric(5),
        address_line1: RandomGenerator.paragraph({ sentences: 3 }),
        is_default: true,
      },
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(stranger);

  await TestValidator.error(
    "review image upload forbidden for non-author",
    async () => {
      await api.functional.shoppingMall.customer.products.reviews.images.create(
        connection,
        {
          productId: product.id,
          reviewId: review.id,
          body: {
            image_uri: `https://cdn.test.com/review/${RandomGenerator.alphaNumeric(11)}.jpg`,
          },
        },
      );
    },
  );
}
