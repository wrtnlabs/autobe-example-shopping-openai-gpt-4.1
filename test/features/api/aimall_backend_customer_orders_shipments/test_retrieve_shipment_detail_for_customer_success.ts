import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAimallBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrder";
import type { IAimallBackendShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendShipment";

/**
 * Test retrieving shipment detail for a customer owning the order and shipment.
 *
 * This test simulates the entire workflow:
 *
 * 1. Register a customer account (as the end user who will own the order and
 *    shipment)
 * 2. Place a new order for the customer (including all required data)
 * 3. Add a shipment to the order (as seller or admin)
 * 4. As the registered customer, retrieve the shipment detail using orderId and
 *    shipmentId
 * 5. Assert that the shipment details (carrier, tracking number, status,
 *    timestamps) are correct and match exactly what was created
 * 6. Ensure sensitive data such as password_hash is never exposed in the customer
 *    flow
 */
export async function test_api_aimall_backend_customer_orders_shipments_test_retrieve_shipment_detail_for_customer_success(
  connection: api.IConnection,
) {
  // 1. Register a customer
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPhone = RandomGenerator.mobile();
  const customerStatus = "active";
  const customer = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: {
        email: customerEmail,
        phone: customerPhone,
        password_hash: null, // simulate customer flow, do not set password_hash in end-user flows per SEC policy
        status: customerStatus,
      },
    },
  );
  typia.assert(customer);
  TestValidator.predicate(
    "password_hash never exposed in user-facing response",
  )(customer.password_hash === undefined || customer.password_hash === null);

  // 2. Customer creates a new order (simulate order placement, minimal required fields)
  const sellerId = typia.random<string & tags.Format<"uuid">>();
  const addressId = typia.random<string & tags.Format<"uuid">>();
  const orderInput: IAimallBackendOrder.ICreate = {
    customer_id: customer.id,
    seller_id: sellerId,
    address_id: addressId,
    order_status: "pending",
    total_amount: 50000,
    currency: "KRW",
  };
  const order = await api.functional.aimall_backend.customer.orders.create(
    connection,
    { body: orderInput },
  );
  typia.assert(order);
  TestValidator.equals("customer_id matches")(order.customer_id)(customer.id);
  TestValidator.equals("order_status is pending")(order.order_status)(
    "pending",
  );

  // 3. Seller (simulate) adds a shipment to the order
  const shipmentAddressId = addressId; // for simplicity, use same address
  const carrier = "CJ Logistics";
  const trackingNumber = "1Z" + RandomGenerator.alphaNumeric(10);
  const shipmentStatus = "shipped";
  const shippedAt = new Date().toISOString();
  const deliveredAt = null;
  const shipmentInput: IAimallBackendShipment.ICreate = {
    order_id: order.id,
    shipment_address_id: shipmentAddressId,
    carrier: carrier,
    tracking_number: trackingNumber,
    shipment_status: shipmentStatus,
    shipped_at: shippedAt,
    delivered_at: deliveredAt,
  };
  const shipment =
    await api.functional.aimall_backend.seller.orders.shipments.create(
      connection,
      {
        orderId: order.id,
        body: shipmentInput,
      },
    );
  typia.assert(shipment);
  TestValidator.equals("shipment order ID matches")(shipment.order_id)(
    order.id,
  );
  TestValidator.equals("carrier matches")(shipment.carrier)(carrier);
  TestValidator.equals("tracking number matches")(shipment.tracking_number)(
    trackingNumber,
  );
  TestValidator.equals("shipment status matches")(shipment.shipment_status)(
    shipmentStatus,
  );
  TestValidator.equals("shipped_at matches")(shipment.shipped_at)(shippedAt);
  TestValidator.equals("delivered_at matches")(shipment.delivered_at)(
    deliveredAt,
  );

  // 4. As the authenticated customer, fetch the shipment detail
  const detail =
    await api.functional.aimall_backend.customer.orders.shipments.at(
      connection,
      {
        orderId: order.id,
        shipmentId: shipment.id,
      },
    );
  typia.assert(detail);
  TestValidator.equals("shipment id matches")(detail.id)(shipment.id);
  TestValidator.equals("order id matches")(detail.order_id)(order.id);
  TestValidator.equals("carrier matches")(detail.carrier)(carrier);
  TestValidator.equals("tracking number matches")(detail.tracking_number)(
    trackingNumber,
  );
  TestValidator.equals("status matches")(detail.shipment_status)(
    shipmentStatus,
  );
  TestValidator.equals("shipped_at matches")(detail.shipped_at)(shippedAt);
  TestValidator.equals("delivered_at matches")(detail.delivered_at)(
    deliveredAt,
  );

  // 5. Sensitive data should not be exposed (eg. password_hash is never present in shipment, order, or shipment detail)
  TestValidator.predicate("password_hash not leaked in shipment detail")(
    !("password_hash" in detail),
  );
}
