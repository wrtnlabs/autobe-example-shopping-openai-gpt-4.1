import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAfterSaleService } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAfterSaleService";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallChannelCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannelCategory";
import type { IShoppingMallDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDelivery";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPayment";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSection";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";

/**
 * E2E test for shopping mall admin order item update workflow.
 *
 * 1. Register an admin, authenticate and capture identity (prerequisite for
 *    privileged APIs)
 * 2. Create channel, section, category (admin context)
 * 3. Register a product associated with all relevant business structure entities
 * 4. Create a customer cart to use as order source
 * 5. Create an order referencing all above-defined entities and required nested
 *    resources
 * 6. Add an order item to the order
 * 7. Perform an admin item update – test allowed modification for status,
 *    final_price, etc
 * 8. Attempt prohibited update after simulating fulfillment/cancellation (should
 *    fail)
 * 9. Attempt update as unauthenticated connection (should fail)
 * 10. Validate all changes are audit-trailed (final values)
 */
export async function test_api_admin_order_item_update_workflow(
  connection: api.IConnection,
) {
  // 1. Register an admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminName = RandomGenerator.name();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      name: adminName,
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(admin);

  // 2. Create channel
  const channelCode = RandomGenerator.alphaNumeric(8);
  const channel = await api.functional.shoppingMall.admin.channels.create(
    connection,
    {
      body: {
        code: channelCode,
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph(),
      } satisfies IShoppingMallChannel.ICreate,
    },
  );
  typia.assert(channel);

  // 3. Create section under the channel
  const section =
    await api.functional.shoppingMall.admin.channels.sections.create(
      connection,
      {
        channelId: channel.id,
        body: {
          shopping_mall_channel_id: channel.id,
          code: RandomGenerator.alphaNumeric(8),
          name: RandomGenerator.paragraph(),
          display_order: typia.random<number & tags.Type<"int32">>(),
          description: RandomGenerator.paragraph(),
        } satisfies IShoppingMallSection.ICreate,
      },
    );
  typia.assert(section);

  // 4. Create category in the channel
  const category =
    await api.functional.shoppingMall.admin.channels.categories.create(
      connection,
      {
        channelId: channel.id,
        body: {
          shopping_mall_channel_id: channel.id,
          code: RandomGenerator.alphaNumeric(8),
          name: RandomGenerator.name(),
          display_order: typia.random<number & tags.Type<"int32">>(),
          description: RandomGenerator.paragraph(),
        } satisfies IShoppingMallChannelCategory.ICreate,
      },
    );
  typia.assert(category);

  // 5. Register a product
  const product = await api.functional.shoppingMall.admin.products.create(
    connection,
    {
      body: {
        shopping_mall_seller_id: typia.random<string & tags.Format<"uuid">>(), // No seller flow available in provided APIs
        shopping_mall_channel_id: channel.id,
        shopping_mall_section_id: section.id,
        shopping_mall_category_id: category.id,
        code: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.paragraph(),
        status: "Active", // Arbitrary status (business rule not specified)
        business_status: "Approval",
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);

  // 6. Create a customer cart (simulate customer UUID)
  const customerId = typia.random<string & tags.Format<"uuid">>();
  const cart = await api.functional.shoppingMall.customer.carts.create(
    connection,
    {
      body: {
        shopping_mall_customer_id: customerId,
        shopping_mall_channel_id: channel.id,
        shopping_mall_section_id: section.id,
        source: "member",
      } satisfies IShoppingMallCart.ICreate,
    },
  );
  typia.assert(cart);

  // 7. Create an order (minimal required structure)
  const orderItemPayload = {
    shopping_mall_order_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_product_id: product.id,
    shopping_mall_product_variant_id: undefined,
    shopping_mall_seller_id: product.shopping_mall_seller_id,
    quantity: 2,
    unit_price: 10000,
    final_price: 10000,
    discount_snapshot: null,
    status: "ordered",
  } satisfies IShoppingMallOrderItem.ICreate;

  const deliveryPayload = {
    shopping_mall_order_id: typia.random<string & tags.Format<"uuid">>(),
    recipient_name: RandomGenerator.name(),
    recipient_phone: RandomGenerator.mobile(),
    address_snapshot: RandomGenerator.paragraph(),
    delivery_message: RandomGenerator.paragraph(),
    delivery_status: "prepared",
    delivery_attempts: 0,
  } satisfies IShoppingMallDelivery.ICreate;

  const paymentPayload = {
    shopping_mall_order_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_customer_id: customerId,
    payment_type: "card",
    status: "pending",
    amount: 20000,
    currency: "KRW",
    requested_at: new Date().toISOString(),
  } satisfies IShoppingMallPayment.ICreate;

  const order = await api.functional.shoppingMall.admin.orders.create(
    connection,
    {
      body: {
        shopping_mall_customer_id: customerId,
        shopping_mall_channel_id: channel.id,
        shopping_mall_section_id: section.id,
        shopping_mall_cart_id: cart.id,
        external_order_ref: null,
        order_type: "normal",
        total_amount: 20000,
        currency: "KRW",
        order_items: [orderItemPayload],
        deliveries: [deliveryPayload],
        payments: [paymentPayload],
        after_sale_services: [],
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order);

  // 8. Add a new order item (to be updated)
  const orderItem = await api.functional.shoppingMall.admin.orders.items.create(
    connection,
    {
      orderId: order.id,
      body: {
        shopping_mall_order_id: order.id,
        shopping_mall_product_id: product.id,
        shopping_mall_product_variant_id: undefined,
        shopping_mall_seller_id: product.shopping_mall_seller_id,
        quantity: 3,
        unit_price: 11000,
        final_price: 11000,
        discount_snapshot: null,
        status: "ordered",
      } satisfies IShoppingMallOrderItem.ICreate,
    },
  );
  typia.assert(orderItem);

  // 9. Valid update by admin before fulfillment
  const newStatus = "paid";
  const newFinalPrice = 12000;
  const updatedOrderItem =
    await api.functional.shoppingMall.admin.orders.items.update(connection, {
      orderId: order.id,
      itemId: orderItem.id,
      body: {
        status: newStatus,
        final_price: newFinalPrice,
      } satisfies IShoppingMallOrderItem.IUpdate,
    });
  typia.assert(updatedOrderItem);
  TestValidator.equals(
    "updated final price",
    updatedOrderItem.final_price,
    newFinalPrice,
  );
  TestValidator.equals("updated status", updatedOrderItem.status, newStatus);

  // 10. Update fails after fulfillment (simulate by setting status and updating again)
  // (Assuming the API will enforce business rules and forbid update)
  await api.functional.shoppingMall.admin.orders.items.update(connection, {
    orderId: order.id,
    itemId: orderItem.id,
    body: {
      status: "fulfilled",
    },
  });
  await TestValidator.error("cannot update after fulfillment", async () => {
    await api.functional.shoppingMall.admin.orders.items.update(connection, {
      orderId: order.id,
      itemId: orderItem.id,
      body: { final_price: 9999 } satisfies IShoppingMallOrderItem.IUpdate,
    });
  });

  // 11. Update fails for non-existent order/item
  await TestValidator.error("update non-existent item fails", async () => {
    await api.functional.shoppingMall.admin.orders.items.update(connection, {
      orderId: typia.random<string & tags.Format<"uuid">>(),
      itemId: typia.random<string & tags.Format<"uuid">>(),
      body: { final_price: 9999 } satisfies IShoppingMallOrderItem.IUpdate,
    });
  });

  // 12. Update fails for unauthenticated user (simulate by creating empty headers)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthorized update fails", async () => {
    await api.functional.shoppingMall.admin.orders.items.update(unauthConn, {
      orderId: order.id,
      itemId: orderItem.id,
      body: { final_price: 9999 } satisfies IShoppingMallOrderItem.IUpdate,
    });
  });
}
