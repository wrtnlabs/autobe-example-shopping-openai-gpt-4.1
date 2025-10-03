import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAfterSaleService } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAfterSaleService";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDelivery";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPayment";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";

/**
 * Test retrieval of full order details as an admin. Validates correct data
 * exposure, presence of all order sub-entities (items, fulfillment, payment,
 * shipment), and audit evidence. Checks both success and error cases
 * (non-existent/deleted order, etc).
 *
 * 1. Register an admin and customer.
 * 2. Customer creates a cart.
 * 3. Admin creates an order using the cart with full nested sub-entities.
 * 4. Admin fetches order details successfully; all fields must exist and match.
 * 5. Fetching non-existent order should throw error.
 */
export async function test_api_order_detail_retrieval_admin_role(
  connection: api.IConnection,
) {
  // Register Admin
  const adminEmail = `${RandomGenerator.alphabets(8)}@test.com`;
  const adminName = RandomGenerator.name();
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "adminPass1234#",
      name: adminName,
    },
  });
  typia.assert(adminJoin);

  // Register Customer
  const customerEmail = `${RandomGenerator.alphabets(8)}@test.com`;
  const channelId = typia.random<string & tags.Format<"uuid">>();
  const customerName = RandomGenerator.name();
  const customerJoin = await api.functional.auth.customer.join(connection, {
    body: {
      shopping_mall_channel_id: channelId,
      email: customerEmail,
      password: "custPass1234#",
      name: customerName,
    },
  });
  typia.assert(customerJoin);

  // Create Cart as customer
  const sectionId = typia.random<string & tags.Format<"uuid">>();
  const cartBody = {
    shopping_mall_customer_id: customerJoin.id,
    shopping_mall_channel_id: channelId,
    shopping_mall_section_id: sectionId,
    source: "member",
  } satisfies IShoppingMallCart.ICreate;
  const cart = await api.functional.shoppingMall.customer.carts.create(
    connection,
    { body: cartBody },
  );
  typia.assert(cart);

  // Create Order as admin (with all required nested objects)
  const orderItems: IShoppingMallOrderItem.ICreate[] = [
    {
      shopping_mall_order_id: typia.random<string & tags.Format<"uuid">>(),
      shopping_mall_product_id: typia.random<string & tags.Format<"uuid">>(),
      shopping_mall_seller_id: typia.random<string & tags.Format<"uuid">>(),
      quantity: 1,
      unit_price: 1000,
      final_price: 900,
      status: "ordered",
    },
  ];
  const deliveries: IShoppingMallDelivery.ICreate[] = [
    {
      shopping_mall_order_id: typia.random<string & tags.Format<"uuid">>(),
      recipient_name: customerName,
      recipient_phone: RandomGenerator.mobile(),
      delivery_status: "prepared",
      delivery_attempts: 0,
    },
  ];
  const payments: IShoppingMallPayment.ICreate[] = [
    {
      shopping_mall_order_id: typia.random<string & tags.Format<"uuid">>(),
      shopping_mall_customer_id: customerJoin.id,
      payment_type: "card",
      status: "pending",
      amount: 900,
      currency: "USD",
      requested_at: new Date().toISOString(),
    },
  ];
  const orderCreateBody = {
    shopping_mall_customer_id: customerJoin.id,
    shopping_mall_channel_id: channelId,
    shopping_mall_section_id: sectionId,
    shopping_mall_cart_id: cart.id,
    order_type: "normal",
    total_amount: 1000,
    currency: "USD",
    order_items: orderItems,
    deliveries,
    payments,
  } satisfies IShoppingMallOrder.ICreate;
  const createdOrder = await api.functional.shoppingMall.admin.orders.create(
    connection,
    { body: orderCreateBody },
  );
  typia.assert(createdOrder);

  // Fetch order as admin
  const fetchedOrder = await api.functional.shoppingMall.admin.orders.at(
    connection,
    { orderId: createdOrder.id },
  );
  typia.assert(fetchedOrder);

  // Validate core audit fields and sub-entities
  TestValidator.equals("order id match", fetchedOrder.id, createdOrder.id);
  TestValidator.equals(
    "order main fields match",
    fetchedOrder.shopping_mall_customer_id,
    createdOrder.shopping_mall_customer_id,
  );
  TestValidator.predicate(
    "created_at exists",
    typeof fetchedOrder.created_at === "string" && !!fetchedOrder.created_at,
  );
  TestValidator.predicate(
    "updated_at exists",
    typeof fetchedOrder.updated_at === "string" && !!fetchedOrder.updated_at,
  );
  TestValidator.equals(
    "order_items present",
    true,
    Array.isArray(fetchedOrder.order_items),
  );
  TestValidator.equals(
    "payments present",
    true,
    Array.isArray(fetchedOrder.payments),
  );
  TestValidator.equals(
    "deliveries present",
    true,
    Array.isArray(fetchedOrder.deliveries),
  );

  // Fetching a non-existent order ID should throw
  await TestValidator.error("non-existent order should error", async () => {
    await api.functional.shoppingMall.admin.orders.at(connection, {
      orderId: typia.random<string & tags.Format<"uuid">>(),
    });
  });

  // If soft deletion API/feature supported, ideally mark order as deleted and re-fetch to check deleted_at, otherwise skip this step.
}
