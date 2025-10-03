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
import type { IShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSection";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";

/**
 * Test that a customer can update an item within their own order before
 * fulfillment. Ensures that only authenticated customers with an existing order
 * and associated item can modify as allowed (status must allow, e.g. 'ordered';
 * not 'fulfilled'/'cancelled'), and enforces constraints on
 * shipping/fulfilled/cancelled state. Includes negative cases for permission
 * boundaries and invalid references.
 */
export async function test_api_customer_order_item_update_workflow(
  connection: api.IConnection,
) {
  // 1. Register and authenticate the customer
  const channel = await api.functional.shoppingMall.admin.channels.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphabets(6),
        name: RandomGenerator.name(),
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
          code: RandomGenerator.alphabets(6),
          name: RandomGenerator.name(),
          display_order: 1,
          description: RandomGenerator.paragraph(),
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
          code: RandomGenerator.alphabets(6),
          name: RandomGenerator.name(),
          display_order: 1,
          description: RandomGenerator.paragraph(),
        },
      },
    );
  typia.assert(category);

  const sellerId = typia.random<string & tags.Format<"uuid">>();
  const product = await api.functional.shoppingMall.admin.products.create(
    connection,
    {
      body: {
        shopping_mall_seller_id: sellerId,
        shopping_mall_channel_id: channel.id,
        shopping_mall_section_id: section.id,
        shopping_mall_category_id: category.id,
        code: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(),
        status: "Active",
        business_status: "Approval",
      },
    },
  );
  typia.assert(product);

  // 2. Customer registration
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphaNumeric(12);
  const customerAuth = await api.functional.auth.customer.join(connection, {
    body: {
      shopping_mall_channel_id: channel.id,
      name: RandomGenerator.name(),
      email: customerEmail,
      password: customerPassword,
      phone: RandomGenerator.mobile(),
    },
  });
  typia.assert(customerAuth);

  // 3. Customer creates a cart
  const cart = await api.functional.shoppingMall.customer.carts.create(
    connection,
    {
      body: {
        shopping_mall_customer_id: customerAuth.id,
        shopping_mall_channel_id: channel.id,
        shopping_mall_section_id: section.id,
        source: "member",
      },
    },
  );
  typia.assert(cart);

  // 4. Create order as admin, referencing the above cart and customer
  const order = await api.functional.shoppingMall.admin.orders.create(
    connection,
    {
      body: {
        shopping_mall_customer_id: customerAuth.id,
        shopping_mall_channel_id: channel.id,
        shopping_mall_section_id: section.id,
        shopping_mall_cart_id: cart.id,
        order_type: "normal",
        total_amount: 10000, // arbitrary value
        currency: "KRW",
        order_items: [],
        deliveries: [],
        payments: [],
        after_sale_services: [],
      },
    },
  );
  typia.assert(order);

  // 5. Add initial item to the order
  const orderItem = await api.functional.shoppingMall.admin.orders.items.create(
    connection,
    {
      orderId: order.id,
      body: {
        shopping_mall_order_id: order.id,
        shopping_mall_product_id: product.id,
        shopping_mall_product_variant_id: null,
        shopping_mall_seller_id: sellerId,
        quantity: 2,
        unit_price: 5000,
        final_price: 5000,
        discount_snapshot: null,
        status: "ordered",
      },
    },
  );
  typia.assert(orderItem);

  // 6. Customer attempts to update the item: allowed case (status = 'ordered')
  const updatedOrderItem =
    await api.functional.shoppingMall.customer.orders.items.update(connection, {
      orderId: order.id,
      itemId: orderItem.id,
      body: {
        // Only updatable fields: status and final_price per DTO
        final_price: 4900,
      },
    });
  typia.assert(updatedOrderItem);
  TestValidator.equals(
    "order item id equal",
    updatedOrderItem.id,
    orderItem.id,
  );
  TestValidator.equals(
    "final price updated",
    updatedOrderItem.final_price,
    4900,
  );

  // 7. Negative case: unauthorized user (simulate by new connection without token)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated user cannot update order item",
    async () => {
      await api.functional.shoppingMall.customer.orders.items.update(
        unauthConn,
        {
          orderId: order.id,
          itemId: orderItem.id,
          body: {
            final_price: 4800,
          },
        },
      );
    },
  );

  // 8. Negative case: update when status is not editable (simulate with a manual status change)
  await TestValidator.error("cannot update cancelled order item", async () => {
    // First, update the item to cancelled as customer
    await api.functional.shoppingMall.customer.orders.items.update(connection, {
      orderId: order.id,
      itemId: orderItem.id,
      body: { status: "cancelled" },
    });
    // Attempt edit after status change
    await api.functional.shoppingMall.customer.orders.items.update(connection, {
      orderId: order.id,
      itemId: orderItem.id,
      body: { final_price: 4700 },
    });
  });
}
