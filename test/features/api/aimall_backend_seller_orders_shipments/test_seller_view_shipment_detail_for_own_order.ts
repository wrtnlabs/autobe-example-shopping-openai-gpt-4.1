import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAimallBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSeller";
import type { IAimallBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrder";
import type { IAimallBackendShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendShipment";

/**
 * Validate that a seller can view the details of their own shipment for a given
 * order.
 *
 * This test verifies that a seller, after onboarding and fulfilling an order,
 * is able to fetch detailed shipment information for a shipment they own. This
 * covers business-critical use-cases such as merchant logistics portals and
 * back-office support tools. Only implemented steps using provided API
 * definitions and DTOs; no unimplementable flows are included.
 *
 * Steps:
 *
 * 1. Register a seller (admin onboarding)
 * 2. Register a customer
 * 3. Customer creates an order referencing the seller
 * 4. Seller creates a shipment for the order (using order's address)
 * 5. Seller fetches the shipment details for that order and shipment IDs
 * 6. Assert fetched record matches created shipment and references correct order
 *    and shipment details
 */
export async function test_api_aimall_backend_seller_orders_shipments_test_seller_view_shipment_detail_for_own_order(
  connection: api.IConnection,
) {
  // 1. Register a new seller via admin API
  const sellerInput: IAimallBackendSeller.ICreate = {
    business_name: RandomGenerator.alphabets(8),
    email: typia.random<string & tags.Format<"email">>(),
    contact_phone: RandomGenerator.mobile(),
    status: "approved",
  };
  const seller =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      { body: sellerInput },
    );
  typia.assert(seller);

  // 2. Register a new customer
  const customerInput: IAimallBackendCustomer.ICreate = {
    email: typia.random<string & tags.Format<"email">>(),
    phone: RandomGenerator.mobile(),
    password_hash: RandomGenerator.alphabets(64),
    status: "active",
  };
  const customer = await api.functional.aimall_backend.customers.create(
    connection,
    { body: customerInput },
  );
  typia.assert(customer);

  // 3. Customer creates an order referencing seller and a simulated address
  const orderInput: IAimallBackendOrder.ICreate = {
    customer_id: customer.id,
    seller_id: seller.id,
    address_id: typia.random<string & tags.Format<"uuid">>(),
    order_status: "pending",
    total_amount: 12345,
    currency: "KRW",
  };
  const order = await api.functional.aimall_backend.customer.orders.create(
    connection,
    { body: orderInput },
  );
  typia.assert(order);

  // 4. Seller creates a shipment for that order
  const shipmentInput: IAimallBackendShipment.ICreate = {
    order_id: order.id,
    shipment_address_id: order.address_id,
    carrier: "CJ Logistics",
    tracking_number: RandomGenerator.alphaNumeric(12),
    shipment_status: "pending",
    shipped_at: null,
    delivered_at: null,
  };
  const shipment =
    await api.functional.aimall_backend.seller.orders.shipments.create(
      connection,
      { orderId: order.id, body: shipmentInput },
    );
  typia.assert(shipment);

  // 5. Seller fetches the shipment details for that order and shipment IDs
  const loaded = await api.functional.aimall_backend.seller.orders.shipments.at(
    connection,
    { orderId: order.id, shipmentId: shipment.id },
  );
  typia.assert(loaded);

  // 6. Assert that loaded record matches the created shipment details
  TestValidator.equals("shipment id")(loaded.id)(shipment.id);
  TestValidator.equals("order id")(loaded.order_id)(order.id);
  TestValidator.equals("shipment carrier")(loaded.carrier)(
    shipmentInput.carrier,
  );
  TestValidator.equals("shipment status")(loaded.shipment_status)(
    shipmentInput.shipment_status,
  );
  TestValidator.equals("shipment tracking number")(loaded.tracking_number)(
    shipmentInput.tracking_number,
  );
}
