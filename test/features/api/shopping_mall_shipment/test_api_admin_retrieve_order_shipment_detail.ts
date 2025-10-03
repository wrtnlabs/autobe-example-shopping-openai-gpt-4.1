import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAfterSaleService } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAfterSaleService";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDelivery";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPayment";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";

/**
 * Validate that administrator can retrieve shipment details for any shipment on
 * any order, regardless of assigned seller or customer.
 *
 * Business context:
 *
 * - Only admin can access this API endpoint to fetch any shipment batch for any
 *   order, crossing normal permission boundaries.
 * - Ensures shipment records are accessible even for orders not directly owned or
 *   created by the admin, and that all shipment detail fields are present and
 *   correct.
 * - Includes validation for error handling when shipment does not exist or is
 *   (soft) deleted.
 *
 * Test procedure:
 *
 * 1. Register and authenticate a new admin.
 * 2. Create a new shopping cart using random valid identifiers (for customer,
 *    channel, section).
 * 3. Create a new order referencing the created cart. Construct valid order_items,
 *    delivery, payment sublists with correct relations and constraints.
 * 4. Register a new shipment batch for the order as admin. Use plausible shipment
 *    details.
 * 5. Retrieve shipment details by admin and validate all fields (via typia.assert
 *    and TestValidator.equals where relations are deterministically known).
 * 6. Attempt to retrieve a shipment with a random (non-existent) UUID and validate
 *    error handling for non-existent records (with TestValidator.error).
 */
export async function test_api_admin_retrieve_order_shipment_detail(
  connection: api.IConnection,
) {
  // 1. Register a new admin and authenticate
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminJoin = {
    email: adminEmail,
    password: adminPassword,
    name: RandomGenerator.name(),
  } satisfies IShoppingMallAdmin.IJoin;
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: adminJoin,
  });
  typia.assert(adminAuth);

  // 2. Create a shopping cart as a fixture (random UUIDs for relations)
  const cartInput = {
    shopping_mall_customer_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_channel_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_section_id: typia.random<string & tags.Format<"uuid">>(),
    source: "admin-e2e-test",
  } satisfies IShoppingMallCart.ICreate;
  const cart = await api.functional.shoppingMall.customer.carts.create(
    connection,
    { body: cartInput },
  );
  typia.assert(cart);

  // 3. Create an order as admin referencing created cart and cart's customer/channel/section
  // Compose a single product, delivery, payment - minimal valid set for order
  const productId = typia.random<string & tags.Format<"uuid">>();
  const sellerId = typia.random<string & tags.Format<"uuid">>();
  const orderItemInput = {
    shopping_mall_order_id: typia.random<string & tags.Format<"uuid">>(), // temp - will be set by order create logic
    shopping_mall_product_id: productId,
    shopping_mall_product_variant_id: null,
    shopping_mall_seller_id: sellerId,
    quantity: 1,
    unit_price: 50000,
    final_price: 48000,
    discount_snapshot: null,
    status: "ordered",
  } satisfies IShoppingMallOrderItem.ICreate;

  const deliveryInput = {
    shopping_mall_order_id: typia.random<string & tags.Format<"uuid">>(), // will be assigned by backend
    recipient_name: RandomGenerator.name(),
    recipient_phone: RandomGenerator.mobile(),
    address_snapshot: RandomGenerator.paragraph(),
    delivery_message: RandomGenerator.paragraph({ sentences: 2 }),
    delivery_status: "prepared",
    delivery_attempts: 1,
  } satisfies IShoppingMallDelivery.ICreate;

  const paymentInput = {
    shopping_mall_order_id: typia.random<string & tags.Format<"uuid">>(), // will be assigned by backend
    shopping_mall_customer_id: cart.shopping_mall_customer_id,
    payment_type: "card",
    external_payment_ref: RandomGenerator.alphaNumeric(16),
    status: "paid",
    amount: 48000,
    currency: "KRW",
    requested_at: new Date().toISOString(),
  } satisfies IShoppingMallPayment.ICreate;

  const orderInput = {
    shopping_mall_customer_id: cart.shopping_mall_customer_id,
    shopping_mall_channel_id: cart.shopping_mall_channel_id,
    shopping_mall_section_id: cart.shopping_mall_section_id,
    shopping_mall_cart_id: cart.id,
    external_order_ref: null,
    order_type: "normal",
    total_amount: 50000,
    currency: "KRW",
    order_items: [orderItemInput],
    deliveries: [deliveryInput],
    payments: [paymentInput],
    after_sale_services: [],
  } satisfies IShoppingMallOrder.ICreate;
  const order = await api.functional.shoppingMall.admin.orders.create(
    connection,
    { body: orderInput },
  );
  typia.assert(order);

  // 4. Register a shipment batch for the order
  const shipmentInput = {
    shopping_mall_order_id: order.id,
    shopping_mall_seller_id: sellerId,
    shipment_code: RandomGenerator.alphaNumeric(8),
    external_tracking_number: RandomGenerator.alphaNumeric(10),
    carrier: "TestCarrier",
    requested_at: new Date().toISOString(),
    status: "pending",
  } satisfies IShoppingMallShipment.ICreate;
  const shipment =
    await api.functional.shoppingMall.admin.orders.shipments.create(
      connection,
      {
        orderId: order.id,
        body: shipmentInput,
      },
    );
  typia.assert(shipment);

  // 5. Retrieve shipment as admin - positive case
  const fetched = await api.functional.shoppingMall.admin.orders.shipments.at(
    connection,
    {
      orderId: order.id,
      shipmentId: shipment.id,
    },
  );
  typia.assert(fetched);
  TestValidator.equals(
    "fetched shipment matches shipment ID",
    fetched.id,
    shipment.id,
  );
  TestValidator.equals(
    "fetched shipment order ID matches",
    fetched.shopping_mall_order_id,
    order.id,
  );
  TestValidator.equals(
    "fetched shipment seller ID matches",
    fetched.shopping_mall_seller_id,
    sellerId,
  );

  // 6. Retrieve (negative) - non-existent shipment
  const nonExistentShipmentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "admin cannot fetch non-existent shipment detail",
    async () => {
      await api.functional.shoppingMall.admin.orders.shipments.at(connection, {
        orderId: order.id,
        shipmentId: nonExistentShipmentId,
      });
    },
  );
}
