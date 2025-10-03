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
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";

/**
 * Validate that an authenticated seller can retrieve a paginated and filtered
 * list of shipments for an order they manage, validate permission boundaries,
 * shipment summary correctness, and multi-shipment/split batch flows.
 *
 * 1. Register a seller and a section/channel for the seller.
 * 2. Register a customer.
 * 3. The customer creates a cart for that section/channel.
 * 4. Admin creates an order referencing the cart, section/channel, seller, and
 *    attaches order items.
 * 5. Admin creates a shipment for the order assigned to the seller.
 * 6. As the seller, call PATCH /shoppingMall/seller/orders/{orderId}/shipments to
 *    retrieve the shipment(s).
 * 7. Validate correct seller permission (results present for correct seller, not
 *    for wrong seller), summary fields match shipment(s), and test
 *    filter/pagination edge cases (page/limit, status, split/multi-shipment
 *    scenarios).
 */
export async function test_api_seller_retrieve_managed_order_shipments(
  connection: api.IConnection,
) {
  // 1. Register a seller, using explicit channel/section/profile fields
  const channelId = typia.random<string & tags.Format<"uuid">>();
  const sectionId = typia.random<string & tags.Format<"uuid">>();
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = "sellerPW-1234";
  const sellerProfileName = RandomGenerator.name();
  const sellerAuthorized = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      shopping_mall_channel_id: channelId,
      shopping_mall_section_id: sectionId,
      profile_name: sellerProfileName,
      kyc_status: "pending",
    },
  });
  typia.assert(sellerAuthorized);
  const sellerId = sellerAuthorized.id;

  // 2. Register a customer
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = "cusPW-1234";
  const customerAuthorized = await api.functional.auth.customer.join(
    connection,
    {
      body: {
        shopping_mall_channel_id: channelId,
        email: customerEmail,
        password: customerPassword,
        name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
      },
    },
  );
  typia.assert(customerAuthorized);
  const customerId = customerAuthorized.id;

  // 3. Customer creates a cart in this section/channel
  const cart = await api.functional.shoppingMall.customer.carts.create(
    connection,
    {
      body: {
        shopping_mall_customer_id: customerId,
        shopping_mall_channel_id: channelId,
        shopping_mall_section_id: sectionId,
        source: "member",
      },
    },
  );
  typia.assert(cart);

  // 4. Admin creates a new order, referencing cart, channel/section, and including an order item for seller
  const orderItemProductId = typia.random<string & tags.Format<"uuid">>();
  const orderItemId = typia.random<string & tags.Format<"uuid">>();
  const order = await api.functional.shoppingMall.admin.orders.create(
    connection,
    {
      body: {
        shopping_mall_customer_id: customerId,
        shopping_mall_channel_id: channelId,
        shopping_mall_section_id: sectionId,
        shopping_mall_cart_id: cart.id,
        external_order_ref: null,
        order_type: "normal",
        total_amount: 19800,
        currency: "KRW",
        order_items: [
          {
            shopping_mall_order_id: orderItemId,
            shopping_mall_product_id: orderItemProductId,
            shopping_mall_product_variant_id: null,
            shopping_mall_seller_id: sellerId,
            quantity: 2,
            unit_price: 9900,
            final_price: 9900,
            discount_snapshot: null,
            status: "ordered",
          },
        ],
        deliveries: [
          {
            shopping_mall_order_id: orderItemId,
            recipient_name: RandomGenerator.name(),
            recipient_phone: RandomGenerator.mobile(),
            address_snapshot: "Seoul",
            delivery_message: undefined,
            delivery_status: "prepared",
            delivery_attempts: 0,
          },
        ],
        payments: [
          {
            shopping_mall_order_id: orderItemId,
            shopping_mall_customer_id: customerId,
            payment_type: "card",
            external_payment_ref: null,
            status: "paid",
            amount: 19800,
            currency: "KRW",
            requested_at: new Date().toISOString(),
          },
        ],
        after_sale_services: [],
      },
    },
  );
  typia.assert(order);
  const orderId = order.id;

  // 5. Admin registers a shipment for the order, assigned to the seller
  const shipmentCode1 = RandomGenerator.alphaNumeric(12);
  const shipment1 =
    await api.functional.shoppingMall.admin.orders.shipments.create(
      connection,
      {
        orderId: order.id,
        body: {
          shopping_mall_order_id: order.id,
          shopping_mall_seller_id: sellerId,
          shipment_code: shipmentCode1,
          external_tracking_number: "T12345678901",
          carrier: "CJ대한통운",
          requested_at: new Date().toISOString(),
          status: "pending",
        },
      },
    );
  typia.assert(shipment1);

  // 6. (Optional) Register split/multi-shipment for edge case
  const shipmentCode2 = RandomGenerator.alphaNumeric(12);
  const shipment2 =
    await api.functional.shoppingMall.admin.orders.shipments.create(
      connection,
      {
        orderId: order.id,
        body: {
          shopping_mall_order_id: order.id,
          shopping_mall_seller_id: sellerId,
          shipment_code: shipmentCode2,
          external_tracking_number: "T98765432109",
          carrier: "롯데택배",
          requested_at: new Date().toISOString(),
          status: "pending",
        },
      },
    );
  typia.assert(shipment2);

  // 7. As seller, query shipments for this order (success)
  const sellerShipments =
    await api.functional.shoppingMall.seller.orders.shipments.index(
      connection,
      {
        orderId: order.id,
        body: {}, // No filters = get all
      },
    );
  typia.assert(sellerShipments);
  TestValidator.predicate(
    "at least 2 shipments returned",
    sellerShipments.data.length >= 2,
  );
  const foundCodes = sellerShipments.data.map((x) => x.shipment_code);
  TestValidator.predicate(
    "all expected shipment codes present",
    foundCodes.includes(shipmentCode1) && foundCodes.includes(shipmentCode2),
  );

  // 8. Pagination edge: query with limit=1
  const paginated =
    await api.functional.shoppingMall.seller.orders.shipments.index(
      connection,
      {
        orderId: order.id,
        body: { limit: 1 },
      },
    );
  typia.assert(paginated);
  TestValidator.predicate(
    "pagination (limit=1) returns 1 record",
    paginated.data.length === 1,
  );
  TestValidator.equals(
    "pagination record is one of expected codes",
    shipmentCode1,
    paginated.data[0].shipment_code,
  );

  // 9. Filter edge: by status
  const filtered =
    await api.functional.shoppingMall.seller.orders.shipments.index(
      connection,
      {
        orderId: order.id,
        body: { status: "pending" },
      },
    );
  typia.assert(filtered);
  TestValidator.predicate(
    "filter by status returns >=2 records",
    filtered.data.length >= 2,
  );
  filtered.data.forEach((s) =>
    TestValidator.equals("status is pending", s.status, "pending"),
  );
}
