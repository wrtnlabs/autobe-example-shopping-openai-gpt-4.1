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
 * Validate customer can update their own product review and forbidden update by
 * another user.
 *
 * Steps:
 *
 * 1. Register customer A
 * 2. Create channel, section, and category
 * 3. Register product
 * 4. Customer A creates cart
 * 5. Place order as customer A
 * 6. Customer A writes review for purchased product
 * 7. Update the review as customer A; validate update
 * 8. Try to update review as a different customer (customer B); expect forbidden
 */
export async function test_api_review_update_success_by_review_owner(
  connection: api.IConnection,
) {
  // 1. Register customer A
  const channel = await api.functional.shoppingMall.admin.channels.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IShoppingMallChannel.ICreate,
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
          name: RandomGenerator.name(),
          display_order: 1,
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IShoppingMallSection.ICreate,
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
          code: RandomGenerator.alphaNumeric(6),
          name: RandomGenerator.name(),
          display_order: 1,
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IShoppingMallChannelCategory.ICreate,
      },
    );
  typia.assert(category);

  const customerAEmail = typia.random<string & tags.Format<"email">>();
  const customerA = await api.functional.auth.customer.join(connection, {
    body: {
      shopping_mall_channel_id: channel.id,
      email: customerAEmail,
      password: "password1",
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerA);

  // 2. Register product
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        shopping_mall_seller_id: typia.random<string & tags.Format<"uuid">>(),
        shopping_mall_channel_id: channel.id,
        shopping_mall_section_id: section.id,
        shopping_mall_category_id: category.id,
        code: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.paragraph({ sentences: 2 }),
        status: "Active",
        business_status: "Approval",
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);

  // 3. Customer A creates cart
  const cart = await api.functional.shoppingMall.customer.carts.create(
    connection,
    {
      body: {
        shopping_mall_customer_id: customerA.id,
        shopping_mall_channel_id: channel.id,
        shopping_mall_section_id: section.id,
        source: "member",
      } satisfies IShoppingMallCart.ICreate,
    },
  );
  typia.assert(cart);

  // 4. Customer A places order
  const orderItem = {
    shopping_mall_order_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_product_id: product.id,
    shopping_mall_seller_id: product.shopping_mall_seller_id,
    quantity: 1,
    unit_price: 10000,
    final_price: 10000,
    status: "ordered",
  } satisfies IShoppingMallOrderItem.ICreate;
  const delivery = {
    shopping_mall_order_id: typia.random<string & tags.Format<"uuid">>(),
    recipient_name: customerA.name,
    recipient_phone: customerA.phone!,
    address_snapshot: RandomGenerator.paragraph({ sentences: 4 }),
    delivery_status: "prepared",
    delivery_attempts: 0,
  } satisfies IShoppingMallDelivery.ICreate;
  const payment = {
    shopping_mall_order_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_customer_id: customerA.id,
    payment_type: "card",
    status: "pending",
    amount: 10000,
    currency: "KRW",
    requested_at: new Date().toISOString(),
  } satisfies IShoppingMallPayment.ICreate;
  const order = await api.functional.shoppingMall.admin.orders.create(
    connection,
    {
      body: {
        shopping_mall_customer_id: customerA.id,
        shopping_mall_channel_id: channel.id,
        shopping_mall_section_id: section.id,
        order_type: "normal",
        total_amount: 10000,
        currency: "KRW",
        order_items: [orderItem],
        deliveries: [delivery],
        payments: [payment],
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order);

  // 5. Customer A writes review
  const review = await api.functional.shoppingMall.customer.reviews.create(
    connection,
    {
      body: {
        shopping_mall_product_id: product.id,
        shopping_mall_order_id: order.id,
        rating: 4,
        title: "Initial Review",
        body: "Very nice product",
      } satisfies IShoppingMallReview.ICreate,
    },
  );
  typia.assert(review);

  // 6. Customer A updates review
  const reviewUpdateBody = {
    rating: 5,
    title: "Edited Review",
    body: "Updated review content!",
  } satisfies IShoppingMallReview.IUpdate;
  const updated = await api.functional.shoppingMall.customer.reviews.update(
    connection,
    { reviewId: review.id, body: reviewUpdateBody },
  );
  typia.assert(updated);
  TestValidator.equals("Review should update rating", updated.rating, 5);
  TestValidator.equals(
    "Review should update title",
    updated.title,
    "Edited Review",
  );
  TestValidator.equals(
    "Review should update body",
    updated.body,
    "Updated review content!",
  );
  TestValidator.notEquals(
    "Review updated_at changed",
    updated.updated_at,
    review.updated_at,
  );

  // 7. Register customer B and try forbidden update
  const customerBEmail = typia.random<string & tags.Format<"email">>();
  const customerB = await api.functional.auth.customer.join(connection, {
    body: {
      shopping_mall_channel_id: channel.id,
      email: customerBEmail,
      password: "password2",
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerB);
  await TestValidator.error(
    "Other customer cannot update someone else's review",
    async () => {
      await api.functional.shoppingMall.customer.reviews.update(connection, {
        reviewId: review.id,
        body: {
          body: "malicious edit",
          rating: 2,
        } satisfies IShoppingMallReview.IUpdate,
      });
    },
  );
}
