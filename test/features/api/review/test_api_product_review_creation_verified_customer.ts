import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAfterSaleService } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAfterSaleService";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallChannelCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannelCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDelivery";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPayment";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSection";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";

/**
 * Validate product review creation by a verified customer who has purchased the
 * product.
 *
 * Workflow:
 *
 * 1. Create admin-managed channel, section, and category.
 * 2. Register a seller and add product under created channel/section/category.
 * 3. Register a customer (reviewer).
 * 4. Customer creates a cart for product.
 * 5. Admin creates an order for this customer and product.
 * 6. Customer submits product review (success expected).
 * 7. Validate that review is correct, associated entities match, default
 *    moderation status set.
 * 8. Try duplicate review (same product, order, customer), expect error due to
 *    uniqueness constraint.
 */
export async function test_api_product_review_creation_verified_customer(
  connection: api.IConnection,
) {
  // 1. Admin creates a channel
  const channel = await api.functional.shoppingMall.admin.channels.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph(),
      },
    },
  );
  typia.assert(channel);

  // 2. Admin creates a section
  const section =
    await api.functional.shoppingMall.admin.channels.sections.create(
      connection,
      {
        channelId: channel.id,
        body: {
          shopping_mall_channel_id: channel.id,
          code: RandomGenerator.alphaNumeric(5),
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          display_order: typia.random<number & tags.Type<"int32">>(),
        },
      },
    );
  typia.assert(section);

  // 3. Admin creates a category
  const category =
    await api.functional.shoppingMall.admin.channels.categories.create(
      connection,
      {
        channelId: channel.id,
        body: {
          shopping_mall_channel_id: channel.id,
          parent_id: null,
          code: RandomGenerator.alphaNumeric(5),
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          display_order: typia.random<number & tags.Type<"int32">>(),
        },
      },
    );
  typia.assert(category);

  // 4. Register seller
  const sellerEmail: string = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: "SellerPass!123",
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      shopping_mall_channel_id: channel.id,
      shopping_mall_section_id: section.id,
      profile_name: RandomGenerator.name(),
      kyc_status: "pending",
    },
  });
  typia.assert(seller);

  // 5. Seller registers product
  const productCode = RandomGenerator.alphaNumeric(12);
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        shopping_mall_seller_id: seller.id,
        shopping_mall_channel_id: channel.id,
        shopping_mall_section_id: section.id,
        shopping_mall_category_id: category.id,
        code: productCode,
        name: RandomGenerator.paragraph({ sentences: 3 }),
        status: "Active",
        business_status: "Approval",
      },
    },
  );
  typia.assert(product);

  // 6. Register customer
  const customerEmail: string = typia.random<string & tags.Format<"email">>();
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      shopping_mall_channel_id: channel.id,
      email: customerEmail,
      password: "CustomerPass!123",
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    },
  });
  typia.assert(customer);

  // 7. Customer creates a cart
  const cart = await api.functional.shoppingMall.customer.carts.create(
    connection,
    {
      body: {
        shopping_mall_customer_id: customer.id,
        shopping_mall_channel_id: channel.id,
        shopping_mall_section_id: section.id,
        source: "member",
      },
    },
  );
  typia.assert(cart);

  // 8. Admin creates order for customer/product
  const orderAmount = 10000;
  const order = await api.functional.shoppingMall.admin.orders.create(
    connection,
    {
      body: {
        shopping_mall_customer_id: customer.id,
        shopping_mall_channel_id: channel.id,
        shopping_mall_section_id: section.id,
        shopping_mall_cart_id: cart.id,
        order_type: "normal",
        total_amount: orderAmount,
        currency: "KRW",
        order_items: [
          {
            shopping_mall_order_id: "dummy", // will be set by backend, set dummy or omit if not required
            shopping_mall_product_id: product.id,
            shopping_mall_seller_id: seller.id,
            quantity: 1,
            unit_price: orderAmount,
            final_price: orderAmount,
            status: "ordered",
          },
        ],
        deliveries: [], // required field, can be empty for this test
        payments: [], // required field, can be empty for this test
      },
    },
  );
  typia.assert(order);

  // 9. Customer creates review
  const reviewTitle = RandomGenerator.paragraph({ sentences: 2 });
  const reviewBody = RandomGenerator.content({ paragraphs: 2 });
  const reviewRating = 5;
  const review = await api.functional.shoppingMall.customer.reviews.create(
    connection,
    {
      body: {
        shopping_mall_product_id: product.id,
        shopping_mall_order_id: order.id,
        rating: reviewRating,
        title: reviewTitle,
        body: reviewBody,
      },
    },
  );
  typia.assert(review);

  TestValidator.equals(
    "review product matches created product",
    review.shopping_mall_product_id,
    product.id,
  );
  TestValidator.equals(
    "review order matches created order",
    review.shopping_mall_order_id,
    order.id,
  );
  TestValidator.equals(
    "review rating equals input",
    review.rating,
    reviewRating,
  );
  TestValidator.equals("review title equals input", review.title, reviewTitle);
  TestValidator.equals("review body equals input", review.body, reviewBody);
  TestValidator.equals(
    "review is linked to correct customer",
    review.shopping_mall_customer_id,
    customer.id,
  );
  TestValidator.predicate(
    "moderation status present",
    typeof review.moderation_status === "string" &&
      !!review.moderation_status.length,
  );

  // 10. Attempt duplicate review
  await TestValidator.error(
    "duplicate review for same product/order/customer must fail",
    async () => {
      await api.functional.shoppingMall.customer.reviews.create(connection, {
        body: {
          shopping_mall_product_id: product.id,
          shopping_mall_order_id: order.id,
          rating: 4,
          title: RandomGenerator.paragraph({ sentences: 1 }),
          body: RandomGenerator.content({ paragraphs: 1 }),
        },
      });
    },
  );
}
