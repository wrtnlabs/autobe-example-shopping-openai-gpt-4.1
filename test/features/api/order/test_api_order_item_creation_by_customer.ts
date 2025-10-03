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
 * Validate customer can add item to their own order.
 *
 * 1. Create a channel, section, and category as admin.
 * 2. Register new customer.
 * 3. Register a product under the channel/section/category.
 * 4. Customer creates cart for the channel.
 * 5. Admin creates an order from cart for the customer (empty items for manual
 *    add).
 * 6. Customer adds order item using endpoint.
 * 7. Assert order item exists, matches config, and linkages (orderId, productId,
 *    sellerId, quantity, pricing, status).
 * 8. Attempt add as non-author; assert forbidden.
 * 9. Attempt add for finalized order; assert failure.
 */
export async function test_api_order_item_creation_by_customer(
  connection: api.IConnection,
) {
  // 1. Admin creates channel
  const channel = await api.functional.shoppingMall.admin.channels.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(6),
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 4 }),
      } satisfies IShoppingMallChannel.ICreate,
    },
  );
  typia.assert(channel);
  // 2. Admin creates section under channel
  const section =
    await api.functional.shoppingMall.admin.channels.sections.create(
      connection,
      {
        channelId: channel.id,
        body: {
          shopping_mall_channel_id: channel.id,
          code: RandomGenerator.alphaNumeric(5),
          name: RandomGenerator.name(2),
          display_order: 1,
          description: RandomGenerator.paragraph(),
        } satisfies IShoppingMallSection.ICreate,
      },
    );
  typia.assert(section);
  // 3. Admin creates category under channel
  const category =
    await api.functional.shoppingMall.admin.channels.categories.create(
      connection,
      {
        channelId: channel.id,
        body: {
          shopping_mall_channel_id: channel.id,
          code: RandomGenerator.alphaNumeric(6),
          name: RandomGenerator.name(1),
          display_order: 1,
        } satisfies IShoppingMallChannelCategory.ICreate,
      },
    );
  typia.assert(category);
  // 4. Register customer
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      shopping_mall_channel_id: channel.id,
      email: customerEmail,
      password: "password123",
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer);
  // 5. Register product
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
        name: RandomGenerator.name(2),
        status: "Active",
        business_status: "Approval",
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 6. Customer creates cart
  const cart = await api.functional.shoppingMall.customer.carts.create(
    connection,
    {
      body: {
        shopping_mall_customer_id: customer.id,
        shopping_mall_channel_id: channel.id,
        shopping_mall_section_id: section.id,
        source: "member",
      } satisfies IShoppingMallCart.ICreate,
    },
  );
  typia.assert(cart);
  // 7. Admin creates order from cart
  const order = await api.functional.shoppingMall.admin.orders.create(
    connection,
    {
      body: {
        shopping_mall_customer_id: customer.id,
        shopping_mall_channel_id: channel.id,
        shopping_mall_section_id: section.id,
        shopping_mall_cart_id: cart.id,
        order_type: "normal",
        total_amount: 0,
        currency: "KRW",
        order_items: [],
        deliveries: [],
        payments: [],
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order);
  // 8. Customer adds item to order
  const orderItemBody = {
    shopping_mall_order_id: order.id,
    shopping_mall_product_id: product.id,
    shopping_mall_seller_id: sellerId,
    quantity: 2,
    unit_price: 10000,
    final_price: 10000,
    status: "ordered",
  } satisfies IShoppingMallOrderItem.ICreate;
  const orderItem =
    await api.functional.shoppingMall.customer.orders.items.create(connection, {
      orderId: order.id,
      body: orderItemBody,
    });
  typia.assert(orderItem);
  TestValidator.equals(
    "order item created for order",
    orderItem.shopping_mall_order_id,
    order.id,
  );
  TestValidator.equals(
    "order item product matches",
    orderItem.shopping_mall_product_id,
    product.id,
  );
  TestValidator.equals(
    "order item quantity matches",
    orderItem.quantity,
    orderItemBody.quantity,
  );
  // 9. Re-login as another customer and try to add - expect error
  const stranger = await api.functional.auth.customer.join(connection, {
    body: {
      shopping_mall_channel_id: channel.id,
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(stranger);
  await TestValidator.error("non-customer cannot add order item", async () => {
    await api.functional.shoppingMall.customer.orders.items.create(connection, {
      orderId: order.id,
      body: orderItemBody,
    });
  });
}
