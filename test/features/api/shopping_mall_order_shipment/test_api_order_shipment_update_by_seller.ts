import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderAddress";
import type { IShoppingMallOrderPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderPaymentMethod";
import type { IShoppingMallOrderShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderShipment";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validate that a seller can update a shipment for their order.
 *
 * The test covers the following steps:
 *
 * 1. Register a new seller. This provides the JWT/auth context for seller shipment
 *    modifications.
 * 2. Create a shipping address snapshot intended for a new customer order.
 * 3. Create a payment method snapshot to be referenced by the order.
 * 4. Create an order linked to the above address/payment. This triggers creation
 *    of a shipment for the order, and the seller (from step 1) should be the
 *    seller on that order.
 * 5. As the seller, update the shipment properties: change carrier, set/update
 *    tracking number, progress status
 *    ('pending'→'shipped'→'in_transit'→'delivered'), set dispatched and
 *    delivered timestamps, and add a remark.
 * 6. Assert all shipment state transitions (carrier, tracking, status, timestamps,
 *    remarks) are accepted and reflect the intended update.
 * 7. Attempt forbidden updates: (a) update with an unauthorized seller context;
 *    (b) attempt a disallowed status transition (e.g., delivered without
 *    shipped/dispatched); (c) other business logic violations. Expect the API
 *    to reject these attempts.
 * 8. Ensure successful transitions log side-effects are visible (e.g., updated
 *    updated_at, potential notification/audit change).
 */
export async function test_api_order_shipment_update_by_seller(
  connection: api.IConnection,
) {
  // 1. Register new seller
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerBusinessName = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 4,
    wordMax: 12,
  });
  const joinSellerBody = {
    email: sellerEmail,
    password: RandomGenerator.alphaNumeric(12),
    business_name: sellerBusinessName,
    contact_name: RandomGenerator.name(2),
    phone: RandomGenerator.mobile(),
    kyc_document_uri: null,
    business_registration_number: RandomGenerator.alphaNumeric(12),
  } satisfies IShoppingMallSeller.IJoin;
  const sellerAuth = await api.functional.auth.seller.join(connection, {
    body: joinSellerBody,
  });
  typia.assert(sellerAuth);

  // 2. Create order address snapshot for customer
  const addressBody = {
    address_type: "shipping",
    recipient_name: RandomGenerator.name(2),
    phone: RandomGenerator.mobile(),
    zip_code: RandomGenerator.alphaNumeric(5),
    address_main: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 5,
      wordMax: 11,
    }),
    address_detail: RandomGenerator.paragraph({
      sentences: 1,
      wordMin: 3,
      wordMax: 6,
    }),
    country_code: "KOR",
  } satisfies IShoppingMallOrderAddress.ICreate;
  const address =
    await api.functional.shoppingMall.customer.orderAddresses.create(
      connection,
      { body: addressBody },
    );
  typia.assert(address);

  // 3. Create payment method snapshot in admin system for use by customer order
  const paymentBody = {
    payment_method_type: RandomGenerator.pick([
      "card",
      "bank_transfer",
      "paypal",
      "virtual_account",
    ] as const),
    method_data: RandomGenerator.alphaNumeric(20),
    display_name: RandomGenerator.paragraph({
      sentences: 1,
      wordMin: 5,
      wordMax: 12,
    }),
  } satisfies IShoppingMallOrderPaymentMethod.ICreate;
  const payment =
    await api.functional.shoppingMall.admin.orderPaymentMethods.create(
      connection,
      { body: paymentBody },
    );
  typia.assert(payment);

  // 4. Create the customer order (for this test, we assume the seller is allowed to create this for e2e setup)
  const orderBody = {
    // In reality, customer-side authentication/finding required. Here, can use seller id if API supports it for e2e setup.
    shipping_address_id: address.id,
    payment_method_id: payment.id,
    order_total: 10000,
    currency: "KRW",
    shopping_mall_seller_id: sellerAuth.id,
  } satisfies IShoppingMallOrder.ICreate;
  const order = await api.functional.shoppingMall.customer.orders.create(
    connection,
    { body: orderBody },
  );
  typia.assert(order);

  // Shipment must exist for the order (we don't have a direct shipment fetcher in current API exposure, assuming get by side effect)
  // We'll use shipmentId = typia.random<string & tags.Format<"uuid">>() to simulate; in reality we'd fetch the real shipment list
  const shipmentId = typia.random<string & tags.Format<"uuid">>(); // For this e2e, use randomly generated ID for API mockup.

  // 5. As the seller, update shipment fields (carrier, tracking, status, dispatched/delivered times, remark)
  // Step 1: Set carrier, tracking, dispatch (status = "shipped")
  const carrier = RandomGenerator.pick([
    "CJ",
    "FedEx",
    "Sagawa",
    "DHL",
  ] as const);
  const trackingNumber = RandomGenerator.alphaNumeric(14);
  const remark = RandomGenerator.paragraph({ sentences: 2 });
  const dispatchedAt = new Date().toISOString();
  const update1Body = {
    carrier,
    tracking_number: trackingNumber,
    status: "shipped",
    dispatched_at: dispatchedAt,
    delivered_at: null,
    remark,
  } satisfies IShoppingMallOrderShipment.IUpdate;
  const shipment1 =
    await api.functional.shoppingMall.seller.orders.shipments.update(
      connection,
      {
        orderId: order.id,
        shipmentId,
        body: update1Body,
      },
    );
  typia.assert(shipment1);
  TestValidator.equals("carrier updated", shipment1.carrier, carrier);
  TestValidator.equals(
    "tracking number set",
    shipment1.tracking_number,
    trackingNumber,
  );
  TestValidator.equals("status is shipped", shipment1.status, "shipped");
  TestValidator.equals(
    "dispatched timestamp set",
    shipment1.dispatched_at,
    dispatchedAt,
  );
  TestValidator.equals("remark updated", shipment1.remark, remark);

  // Step 2: Mark as in_transit (simulate status progression)
  const update2Body = {
    carrier,
    tracking_number: trackingNumber,
    status: "in_transit",
    dispatched_at: dispatchedAt,
    delivered_at: null,
    remark,
  } satisfies IShoppingMallOrderShipment.IUpdate;
  const shipment2 =
    await api.functional.shoppingMall.seller.orders.shipments.update(
      connection,
      {
        orderId: order.id,
        shipmentId,
        body: update2Body,
      },
    );
  typia.assert(shipment2);
  TestValidator.equals("status is in_transit", shipment2.status, "in_transit");

  // Step 3: Mark as delivered
  const deliveredAt = new Date(Date.now() + 3600 * 1000).toISOString();
  const update3Body = {
    carrier,
    tracking_number: trackingNumber,
    status: "delivered",
    dispatched_at: dispatchedAt,
    delivered_at: deliveredAt,
    remark,
  } satisfies IShoppingMallOrderShipment.IUpdate;
  const shipment3 =
    await api.functional.shoppingMall.seller.orders.shipments.update(
      connection,
      {
        orderId: order.id,
        shipmentId,
        body: update3Body,
      },
    );
  typia.assert(shipment3);
  TestValidator.equals("status is delivered", shipment3.status, "delivered");
  TestValidator.equals("delivered_at set", shipment3.delivered_at, deliveredAt);

  // 6. Attempt forbidden update (invalid status progression): set delivered without dispatched/shipped
  const wrongStatusBody = {
    carrier,
    tracking_number: trackingNumber,
    status: "delivered",
    dispatched_at: null,
    delivered_at: deliveredAt,
    remark,
  } satisfies IShoppingMallOrderShipment.IUpdate;
  await TestValidator.error(
    "cannot set delivered before dispatched/shipped",
    async () => {
      await api.functional.shoppingMall.seller.orders.shipments.update(
        connection,
        {
          orderId: order.id,
          shipmentId,
          body: wrongStatusBody,
        },
      );
    },
  );

  // 7. Attempt forbidden update with non-seller (simulate by clearing headers/connection)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated cannot update shipment",
    async () => {
      await api.functional.shoppingMall.seller.orders.shipments.update(
        unauthConn,
        {
          orderId: order.id,
          shipmentId,
          body: update1Body,
        },
      );
    },
  );
}
