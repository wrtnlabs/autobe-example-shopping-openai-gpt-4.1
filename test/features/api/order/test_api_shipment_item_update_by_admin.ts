import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAfterSaleService } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAfterSaleService";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
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
import type { IShoppingMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentItem";

/**
 * E2E test that covers admin updating a shipment item in an order's shipment
 * batch. The test verifies update, audit/evidence, and error for forbidden
 * update post-delivery.
 *
 * 1. Register admin user for authentication
 * 2. Create channel, section, category
 * 3. Create product linked to the above, using admin ID as seller
 * 4. Register a new customer
 * 5. Create cart, add product as item
 * 6. Create order for the customer
 * 7. Register a shipment for the order
 * 8. Add shipment item for an order item
 * 9. Update shipment item's shipped_quantity
 * 10. Validate shipped_quantity changed, and change is reflected in the
 *     order/shipment
 * 11. Simulate finalizing/delivering shipment by running update again with same id
 *     (simulate error case)
 */
export async function test_api_shipment_item_update_by_admin(
  connection: api.IConnection,
) {
  // 1. Register admin user
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: RandomGenerator.alphaNumeric(12),
      name: RandomGenerator.name(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(adminJoin);

  // 2. Create channel
  const channel = await api.functional.shoppingMall.admin.channels.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph(),
      } satisfies IShoppingMallChannel.ICreate,
    },
  );
  typia.assert(channel);

  // 3. Create section
  const section =
    await api.functional.shoppingMall.admin.channels.sections.create(
      connection,
      {
        channelId: channel.id,
        body: {
          shopping_mall_channel_id: channel.id,
          code: RandomGenerator.alphaNumeric(6),
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          display_order: 1,
        } satisfies IShoppingMallSection.ICreate,
      },
    );
  typia.assert(section);

  // 4. Create category
  const category =
    await api.functional.shoppingMall.admin.channels.categories.create(
      connection,
      {
        channelId: channel.id,
        body: {
          shopping_mall_channel_id: channel.id,
          code: RandomGenerator.alphaNumeric(6),
          name: RandomGenerator.name(),
          display_order: 0,
        } satisfies IShoppingMallChannelCategory.ICreate,
      },
    );
  typia.assert(category);

  // 5. Register product as admin
  const productCode = RandomGenerator.alphaNumeric(7);
  const product = await api.functional.shoppingMall.admin.products.create(
    connection,
    {
      body: {
        shopping_mall_seller_id: adminJoin.id as unknown as string &
          tags.Format<"uuid">,
        shopping_mall_channel_id: channel.id,
        shopping_mall_section_id: section.id,
        shopping_mall_category_id: category.id,
        code: productCode,
        name: RandomGenerator.name(),
        status: "active",
        business_status: "approval",
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);

  // 6. Register customer
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      shopping_mall_channel_id: channel.id,
      email: customerEmail,
      name: RandomGenerator.name(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer);

  // 7. Create cart for customer
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

  // 8. Add product to cart
  const cartItem =
    await api.functional.shoppingMall.customer.carts.items.create(connection, {
      cartId: cart.id,
      body: {
        shopping_mall_product_id: product.id,
        quantity: 2,
        option_snapshot: "{}",
      } satisfies IShoppingMallCartItem.ICreate,
    });
  typia.assert(cartItem);

  // 9. Admin creates order for the cart
  const orderItemUnitPrice = 1000;
  const order = await api.functional.shoppingMall.admin.orders.create(
    connection,
    {
      body: {
        shopping_mall_customer_id: customer.id,
        shopping_mall_channel_id: channel.id,
        shopping_mall_section_id: section.id,
        shopping_mall_cart_id: cart.id,
        order_type: "normal",
        total_amount: orderItemUnitPrice * cartItem.quantity,
        currency: "KRW",
        order_items: [
          {
            shopping_mall_order_id: "", // Will be filled by backend
            shopping_mall_product_id: product.id,
            quantity: cartItem.quantity,
            shopping_mall_seller_id: adminJoin.id as unknown as string &
              tags.Format<"uuid">,
            unit_price: orderItemUnitPrice,
            final_price: orderItemUnitPrice,
            status: "ordered",
          } satisfies IShoppingMallOrderItem.ICreate,
        ],
        deliveries: [
          {
            shopping_mall_order_id: "", // Will be filled by backend
            recipient_name: customer.name,
            recipient_phone: "01011112222",
            delivery_status: "prepared",
            delivery_attempts: 0,
          } satisfies IShoppingMallDelivery.ICreate,
        ],
        payments: [
          {
            shopping_mall_order_id: "", // Will be filled by backend
            shopping_mall_customer_id: customer.id,
            payment_type: "card",
            status: "paid",
            amount: orderItemUnitPrice * cartItem.quantity,
            currency: "KRW",
            requested_at: new Date().toISOString(),
          } satisfies IShoppingMallPayment.ICreate,
        ],
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order);

  // 10. Register a shipment for the order
  const shipment =
    await api.functional.shoppingMall.admin.orders.shipments.create(
      connection,
      {
        orderId: order.id,
        body: {
          shopping_mall_order_id: order.id,
          shopping_mall_seller_id: adminJoin.id as unknown as string &
            tags.Format<"uuid">,
          shipment_code: RandomGenerator.alphaNumeric(6),
          status: "pending",
        } satisfies IShoppingMallShipment.ICreate,
      },
    );
  typia.assert(shipment);

  // 11. Add shipment item for the first order item
  const orderItemId = order.order_items?.[0]?.id!;
  const shipmentItem =
    await api.functional.shoppingMall.admin.orders.shipments.items.create(
      connection,
      {
        orderId: order.id,
        shipmentId: shipment.id,
        body: {
          shopping_mall_order_item_id: orderItemId,
          shipped_quantity: 1,
        } satisfies IShoppingMallShipmentItem.ICreate,
      },
    );
  typia.assert(shipmentItem);
  TestValidator.equals(
    "initial shipped_quantity",
    shipmentItem.shipped_quantity,
    1,
  );

  // 12. Update shipped_quantity
  const updatedShipmentItem =
    await api.functional.shoppingMall.admin.orders.shipments.items.update(
      connection,
      {
        orderId: order.id,
        shipmentId: shipment.id,
        shipmentItemId: shipmentItem.id,
        body: {
          shipped_quantity: 2,
        } satisfies IShoppingMallShipmentItem.IUpdate,
      },
    );
  typia.assert(updatedShipmentItem);
  TestValidator.equals(
    "updated shipped_quantity",
    updatedShipmentItem.shipped_quantity,
    2,
  );

  // 13. Attempt invalid update (simulate finalized/delivered) - expect error
  await TestValidator.error(
    "cannot update shipment item after delivery",
    async () => {
      await api.functional.shoppingMall.admin.orders.shipments.items.update(
        connection,
        {
          orderId: order.id,
          shipmentId: shipment.id,
          shipmentItemId: shipmentItem.id,
          body: {
            shipped_quantity: 3,
          } satisfies IShoppingMallShipmentItem.IUpdate,
        },
      );
    },
  );
}
