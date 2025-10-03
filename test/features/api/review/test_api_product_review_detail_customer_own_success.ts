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
 * Test that a customer can successfully retrieve detailed information of their
 * own product review. The scenario includes full flow: registering a new
 * customer, registering a product as seller, making an order and review as the
 * customer, and then retrieving the review via the endpoint. Validate that only
 * accessible fields for the review display, and that the business relationships
 * (product, order) are maintained.
 */
export async function test_api_product_review_detail_customer_own_success(
  connection: api.IConnection,
) {
  // 1. Create channel
  const channel = await api.functional.shoppingMall.admin.channels.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
      },
    },
  );
  typia.assert(channel);

  // 2. Create section
  const section =
    await api.functional.shoppingMall.admin.channels.sections.create(
      connection,
      {
        channelId: channel.id,
        body: {
          shopping_mall_channel_id: channel.id,
          code: RandomGenerator.alphaNumeric(6),
          name: RandomGenerator.name(),
          description: null,
          display_order: 1,
        },
      },
    );
  typia.assert(section);

  // 3. Create category
  const category =
    await api.functional.shoppingMall.admin.channels.categories.create(
      connection,
      {
        channelId: channel.id,
        body: {
          shopping_mall_channel_id: channel.id,
          parent_id: null,
          code: RandomGenerator.alphaNumeric(6),
          name: RandomGenerator.name(2),
          description: RandomGenerator.content({ paragraphs: 1 }),
          display_order: 1,
        },
      },
    );
  typia.assert(category);

  // 4. Register seller and set up product
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: "Password123!@#",
      name: RandomGenerator.name(2),
      phone: RandomGenerator.mobile(),
      shopping_mall_channel_id: channel.id,
      shopping_mall_section_id: section.id,
      profile_name: RandomGenerator.name(1),
      kyc_status: "pending",
    },
  });
  typia.assert(seller);
  // The token is managed by the SDK auth automatically

  // 5. Register product
  const productCode = RandomGenerator.alphaNumeric(10);
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
        status: "active",
        business_status: "active",
      },
    },
  );
  typia.assert(product);

  // 6. Register customer and authenticate
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      shopping_mall_channel_id: channel.id,
      email: customerEmail,
      password: "Customer123!@#",
      name: RandomGenerator.name(2),
      phone: RandomGenerator.mobile(),
    },
  });
  typia.assert(customer);
  // Token is automatically set by SDK

  // 7. Create a shopping cart for the customer
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

  // 8. Create order for customer for the above product (minimal, with one item/delivery/payment)
  // Important: Need to match DTO structure and required fields
  const itemPrice = 10000;
  const orderItem = {
    shopping_mall_order_id: typia.random<string & tags.Format<"uuid">>(), // Temp, will be replaced by backend-generated
    shopping_mall_product_id: product.id,
    shopping_mall_product_variant_id: null,
    shopping_mall_seller_id: seller.id,
    quantity: 1,
    unit_price: itemPrice,
    final_price: itemPrice,
    status: "ordered",
  } satisfies IShoppingMallOrderItem.ICreate;
  const delivery = {
    shopping_mall_order_id: typia.random<string & tags.Format<"uuid">>(), // will be replaced
    recipient_name: RandomGenerator.name(),
    recipient_phone: RandomGenerator.mobile(),
    address_snapshot: RandomGenerator.content({ paragraphs: 1 }),
    delivery_message: undefined,
    delivery_status: "prepared",
    delivery_attempts: 0,
  } satisfies IShoppingMallDelivery.ICreate;
  const payment = {
    shopping_mall_order_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_customer_id: customer.id,
    payment_type: "card",
    external_payment_ref: null,
    status: "paid",
    amount: itemPrice,
    currency: "KRW",
    requested_at: new Date().toISOString(),
  } satisfies IShoppingMallPayment.ICreate;
  const orderReq = {
    shopping_mall_customer_id: customer.id,
    shopping_mall_channel_id: channel.id,
    shopping_mall_section_id: section.id,
    shopping_mall_cart_id: cart.id,
    external_order_ref: null,
    order_type: "normal",
    total_amount: itemPrice,
    currency: "KRW",
    order_items: [orderItem],
    deliveries: [delivery],
    payments: [payment],
    after_sale_services: [],
  } satisfies IShoppingMallOrder.ICreate;
  const order = await api.functional.shoppingMall.admin.orders.create(
    connection,
    {
      body: orderReq,
    },
  );
  typia.assert(order);

  // 9. Create review as the customer (the current auth).
  const review = await api.functional.shoppingMall.customer.reviews.create(
    connection,
    {
      body: {
        shopping_mall_product_id: product.id,
        shopping_mall_order_id: order.id,
        rating: 5,
        title: RandomGenerator.paragraph({ sentences: 1 }),
        body: RandomGenerator.content({ paragraphs: 1 }),
      },
    },
  );
  typia.assert(review);

  // 10. Retrieve the review as customer and validate
  const detail = await api.functional.shoppingMall.customer.reviews.at(
    connection,
    {
      reviewId: review.id,
    },
  );
  typia.assert(detail);
  // Validate visible fields and relationships
  TestValidator.equals("review id matches", detail.id, review.id);
  TestValidator.equals(
    "product id matches",
    detail.shopping_mall_product_id,
    product.id,
  );
  TestValidator.equals(
    "order id matches",
    detail.shopping_mall_order_id,
    order.id,
  );
  TestValidator.equals(
    "customer id matches",
    detail.shopping_mall_customer_id,
    customer.id,
  );
  TestValidator.predicate("review rating is correct", detail.rating === 5);
  TestValidator.equals("review body", detail.body, review.body);
  TestValidator.equals("review title", detail.title, review.title);
  TestValidator.equals(
    "moderation status present",
    typeof detail.moderation_status,
    "string",
  );
}
