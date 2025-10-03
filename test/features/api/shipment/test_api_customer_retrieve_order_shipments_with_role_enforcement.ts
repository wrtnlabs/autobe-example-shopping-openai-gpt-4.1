import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShipment";
import type { IShoppingMallAfterSaleService } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAfterSaleService";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDelivery";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPayment";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";

/**
 * E2E: Customer retrieves shipments for their order w/ role enforcement.
 *
 * 1. Register a customer using random (IShoppingMallCustomer.IJoin).
 * 2. Customer creates a cart with random IShoppingMallCart.ICreate referencing
 *    that customer/channel/section.
 * 3. Admin places an order from that cart (IShoppingMallOrder.ICreate), with
 *    typia-generated order item and delivery/payment.
 * 4. Admin registers a shipment for the order (IShoppingMallShipment.ICreate,
 *    referencing order/seller).
 * 5. Customer retrieves shipments for order, using PATCH
 *    /shoppingMall/customer/orders/{orderId}/shipments
 *    (api.functional.shoppingMall.customer.orders.shipments.index). Request
 *    with and without filter.
 * 6. Assert that result contains expected shipment, correct meta info, and that
 *    pagination is correct.
 * 7. (Negative) Register a second customer (not order owner). Attempt to list
 *    shipments for the order; assert access denied business error.
 */
export async function test_api_customer_retrieve_order_shipments_with_role_enforcement(
  connection: api.IConnection,
) {
  // Register a customer
  const joinInput = {
    shopping_mall_channel_id: typia.random<string & tags.Format<"uuid">>(),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IShoppingMallCustomer.IJoin;
  const customer = await api.functional.auth.customer.join(connection, {
    body: joinInput,
  });
  typia.assert(customer);

  // Customer creates a cart
  const cartInput = {
    shopping_mall_customer_id: customer.id,
    shopping_mall_channel_id: customer.shopping_mall_channel_id,
    shopping_mall_section_id: typia.random<string & tags.Format<"uuid">>(),
    source: "member",
  } satisfies IShoppingMallCart.ICreate;
  const cart = await api.functional.shoppingMall.customer.carts.create(
    connection,
    { body: cartInput },
  );
  typia.assert(cart);

  // Admin creates an order for the cart (simulate admin privilege)
  const sellerId = typia.random<string & tags.Format<"uuid">>();
  const productId = typia.random<string & tags.Format<"uuid">>();
  const orderItem = {
    shopping_mall_order_id: typia.random<string & tags.Format<"uuid">>(), // placeholder, backend should correct it
    shopping_mall_product_id: productId,
    shopping_mall_product_variant_id: undefined,
    shopping_mall_seller_id: sellerId,
    quantity: 1,
    unit_price: 10000,
    final_price: 9500,
    discount_snapshot: null,
    status: "ordered",
  } satisfies IShoppingMallOrderItem.ICreate;
  const deliveryInput = {
    shopping_mall_order_id: typia.random<string & tags.Format<"uuid">>(), // again, placeholder, backend corrects
    shopping_mall_shipment_id: undefined,
    recipient_name: RandomGenerator.name(),
    recipient_phone: RandomGenerator.mobile(),
    address_snapshot: RandomGenerator.paragraph(),
    delivery_message: "Please call before delivery.",
    delivery_status: "prepared",
    delivery_attempts: 0,
  } satisfies IShoppingMallDelivery.ICreate;
  const paymentInput = {
    shopping_mall_order_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_customer_id: customer.id,
    payment_type: "card",
    external_payment_ref: null,
    status: "paid",
    amount: 9500,
    currency: "KRW",
    requested_at: new Date().toISOString(),
  } satisfies IShoppingMallPayment.ICreate;

  const createOrderInput = {
    shopping_mall_customer_id: customer.id,
    shopping_mall_channel_id: customer.shopping_mall_channel_id,
    shopping_mall_section_id: cart.shopping_mall_section_id,
    shopping_mall_cart_id: cart.id,
    external_order_ref: null,
    order_type: "normal",
    total_amount: 10000,
    currency: "KRW",
    order_items: [orderItem],
    deliveries: [deliveryInput],
    payments: [paymentInput],
    after_sale_services: [],
  } satisfies IShoppingMallOrder.ICreate;
  const order = await api.functional.shoppingMall.admin.orders.create(
    connection,
    { body: createOrderInput },
  );
  typia.assert(order);

  // Admin registers a shipment for the order
  const shipmentInput = {
    shopping_mall_order_id: order.id,
    shopping_mall_seller_id: sellerId,
    shipment_code: RandomGenerator.alphaNumeric(12),
    external_tracking_number: RandomGenerator.alphaNumeric(16),
    carrier: RandomGenerator.name(1),
    requested_at: new Date().toISOString(),
    status: "pending",
  } satisfies IShoppingMallShipment.ICreate;
  const shipment =
    await api.functional.shoppingMall.admin.orders.shipments.create(
      connection,
      { orderId: order.id, body: shipmentInput },
    );
  typia.assert(shipment);

  // Customer requests shipment list (no filters, all shipments)
  const pageResult =
    await api.functional.shoppingMall.customer.orders.shipments.index(
      connection,
      {
        orderId: order.id,
        body: {},
      },
    );
  typia.assert(pageResult);
  TestValidator.predicate(
    "owner customer can see at least one shipment",
    pageResult.data.some((s) => s.id === shipment.id),
  );

  // Filter by status
  const filteredResult =
    await api.functional.shoppingMall.customer.orders.shipments.index(
      connection,
      {
        orderId: order.id,
        body: { status: shipment.status },
      },
    );
  typia.assert(filteredResult);
  TestValidator.predicate(
    "filter by status returns matching shipments",
    filteredResult.data.every((s) => s.status === shipment.status),
  );
  // Pagination checks
  TestValidator.equals(
    "pagination reflects result count",
    filteredResult.pagination.records,
    filteredResult.data.length,
  );

  // Negative: non-owner customer should be denied
  const strangerJoin = await api.functional.auth.customer.join(connection, {
    body: {
      shopping_mall_channel_id: customer.shopping_mall_channel_id,
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(strangerJoin);
  // Switch connection to stranger
  await api.functional.auth.customer.join(connection, {
    body: {
      shopping_mall_channel_id: customer.shopping_mall_channel_id,
      email: strangerJoin.email,
      password: strangerJoin.token.access,
      name: strangerJoin.name,
      phone: strangerJoin.phone,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  await TestValidator.error(
    "non-owner should not access shipment list",
    async () => {
      await api.functional.shoppingMall.customer.orders.shipments.index(
        connection,
        {
          orderId: order.id,
          body: {},
        },
      );
    },
  );
}
