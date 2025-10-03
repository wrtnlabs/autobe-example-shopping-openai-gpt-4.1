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
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";

/**
 * Validates permission enforcement on review updates by non-owners (customer).
 *
 * Scenario:
 *
 * 1. Register customerA (and acquire token/ID)
 * 2. Admin creates a channel, section, and category
 * 3. Seller creates a product for that channel/section/category
 * 4. Register customerB (as different customer)
 * 5. CustomerA creates a cart for the product
 * 6. Admin creates an order for customerA, referencing the cart and product
 * 7. CustomerA writes a review about the product/order
 * 8. CustomerB, as a different user, attempts to update customerA's review via the
 *    /shoppingMall/customer/reviews/{reviewId} endpoint
 * 9. The update must be rejected due to lack of permission; no update is permitted
 * 10. Assert that error is thrown and, if possible, that the review was not changed
 *     since customerB's attempt
 */
export async function test_api_review_update_forbidden_by_non_owner(
  connection: api.IConnection,
) {
  // 1. Register customerA
  const channel = await api.functional.shoppingMall.admin.channels.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph(),
      },
    },
  );
  typia.assert(channel);

  const section =
    await api.functional.shoppingMall.admin.channels.sections.create(
      connection,
      {
        channelId: channel.id,
        body: {
          shopping_mall_channel_id: channel.id,
          code: RandomGenerator.alphaNumeric(6),
          name: RandomGenerator.name(1),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          display_order: typia.random<number & tags.Type<"int32">>(),
        },
      },
    );
  typia.assert(section);

  const category =
    await api.functional.shoppingMall.admin.channels.categories.create(
      connection,
      {
        channelId: channel.id,
        body: {
          shopping_mall_channel_id: channel.id,
          parent_id: null,
          code: RandomGenerator.alphaNumeric(6),
          name: RandomGenerator.name(1),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          display_order: typia.random<number & tags.Type<"int32">>(),
        },
      },
    );
  typia.assert(category);

  // For simplicity in this test, we assume seller identity is implicit or handled by a privileged session (as test is only about review update access)
  const sellerId = typia.random<string & tags.Format<"uuid">>();
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        shopping_mall_seller_id: sellerId,
        shopping_mall_channel_id: channel.id,
        shopping_mall_section_id: section.id,
        shopping_mall_category_id: category.id,
        code: RandomGenerator.alphaNumeric(12),
        name: RandomGenerator.name(2),
        status: "Active",
        business_status: "Approval",
      },
    },
  );
  typia.assert(product);

  const customerAEmail = typia.random<string & tags.Format<"email">>();
  const customerA = await api.functional.auth.customer.join(connection, {
    body: {
      shopping_mall_channel_id: channel.id,
      email: customerAEmail,
      password: RandomGenerator.alphaNumeric(12),
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    },
  });
  typia.assert(customerA);

  // 5. CustomerA creates cart
  const cart = await api.functional.shoppingMall.customer.carts.create(
    connection,
    {
      body: {
        shopping_mall_customer_id: customerA.id,
        shopping_mall_channel_id: channel.id,
        shopping_mall_section_id: section.id,
        source: "member",
      },
    },
  );
  typia.assert(cart);

  // 6. Admin creates an order for customerA (simulate complete payment/shipping)
  const order = await api.functional.shoppingMall.admin.orders.create(
    connection,
    {
      body: {
        shopping_mall_customer_id: customerA.id,
        shopping_mall_channel_id: channel.id,
        shopping_mall_section_id: section.id,
        shopping_mall_cart_id: cart.id,
        order_type: "normal",
        total_amount: 10_000,
        currency: "KRW",
        order_items: [
          {
            shopping_mall_order_id: typia.random<
              string & tags.Format<"uuid">
            >(),
            shopping_mall_product_id: product.id,
            shopping_mall_seller_id: sellerId,
            quantity: 1,
            unit_price: 10_000,
            final_price: 10_000,
            status: "ordered",
          },
        ],
        deliveries: [
          {
            shopping_mall_order_id: typia.random<
              string & tags.Format<"uuid">
            >(),
            recipient_name: customerA.name,
            recipient_phone: customerA.phone ?? RandomGenerator.mobile(),
            delivery_status: "prepared",
            delivery_attempts: 1,
          },
        ],
        payments: [
          {
            shopping_mall_order_id: typia.random<
              string & tags.Format<"uuid">
            >(),
            shopping_mall_customer_id: customerA.id,
            payment_type: "card",
            status: "paid",
            amount: 10_000,
            currency: "KRW",
            requested_at: new Date().toISOString(),
          },
        ],
      },
    },
  );
  typia.assert(order);

  // 7. customerA writes a review for the product/order
  const review = await api.functional.shoppingMall.customer.reviews.create(
    connection,
    {
      body: {
        shopping_mall_product_id: product.id,
        shopping_mall_order_id: order.id,
        rating: 5,
        title: RandomGenerator.paragraph({ sentences: 1 }),
        body: RandomGenerator.paragraph({ sentences: 5 }),
      },
    },
  );
  typia.assert(review);

  // 8. Register customerB (different customer)
  const customerBEmail = typia.random<string & tags.Format<"email">>();
  const customerB = await api.functional.auth.customer.join(connection, {
    body: {
      shopping_mall_channel_id: channel.id,
      email: customerBEmail,
      password: RandomGenerator.alphaNumeric(12),
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    },
  });
  typia.assert(customerB);

  // 9. CustomerB attempts to update customerA's review
  // (Should fail: not owner)
  await TestValidator.error(
    "customerB forbidden from updating customerA's review",
    async () => {
      await api.functional.shoppingMall.customer.reviews.update(connection, {
        reviewId: review.id,
        body: {
          rating: 1,
          title: RandomGenerator.paragraph({ sentences: 1 }),
          body: "Illegal update by non-owner",
        },
      });
    },
  );
}
