import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAimallBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrder";
import type { IAimallBackendShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendShipment";

/**
 * Validate that a customer cannot retrieve shipment details for an order they
 * do not own.
 *
 * This test ensures that private shipment details of orders are inaccessible to
 * other customers. Specifically, shipment records must not be visible to
 * customers who are not the owner/creator of the order. Private logistics/audit
 * details must also be inaccessible.
 *
 * Business context:
 *
 * - Each customer should only be able to access shipment details for their own
 *   orders, to protect PII and business confidentiality.
 * - Customers must never be able to view shipment details tied to others’
 *   orders—this includes explicit access attempts (UUID guessing etc.).
 *
 * Step-by-step process:
 *
 * 1. Create Customer A (order owner) and Customer B (unauthorized customer).
 * 2. As Customer A, place a valid order (populate required fields with test UUIDs
 *    and random values).
 * 3. As Seller, add a shipment to the order (simulate with placeholder values as
 *    needed; required for the shipmentId).
 * 4. As Customer B, attempt to access the shipment detail of the order belonging
 *    to Customer A using the orderId and shipmentId.
 * 5. Assert an authorization error occurs (HttpError with 403 or similar), and
 *    that no shipment details are disclosed to Customer B.
 */
export async function test_api_aimall_backend_customer_orders_shipments_test_retrieve_shipment_detail_for_unauthorized_customer(
  connection: api.IConnection,
) {
  // 1. Create Customer A
  const customerAEmail = typia.random<string & tags.Format<"email">>();
  const customerA: IAimallBackendCustomer =
    await api.functional.aimall_backend.customers.create(connection, {
      body: {
        email: customerAEmail,
        phone: RandomGenerator.mobile(),
        status: "active",
      } satisfies IAimallBackendCustomer.ICreate,
    });
  typia.assert(customerA);

  // 2. Create Customer B
  const customerBEmail = typia.random<string & tags.Format<"email">>();
  const customerB: IAimallBackendCustomer =
    await api.functional.aimall_backend.customers.create(connection, {
      body: {
        email: customerBEmail,
        phone: RandomGenerator.mobile(),
        status: "active",
      } satisfies IAimallBackendCustomer.ICreate,
    });
  typia.assert(customerB);

  // 3. As Customer A, place an order
  const sellerId = typia.random<string & tags.Format<"uuid">>();
  const addressId = typia.random<string & tags.Format<"uuid">>();
  const order: IAimallBackendOrder =
    await api.functional.aimall_backend.customer.orders.create(connection, {
      body: {
        customer_id: customerA.id,
        seller_id: sellerId,
        address_id: addressId,
        order_status: "pending",
        total_amount: 10000,
        currency: "KRW",
      } satisfies IAimallBackendOrder.ICreate,
    });
  typia.assert(order);

  // 4. As Seller, add a shipment to Customer A's order
  const shipment: IAimallBackendShipment =
    await api.functional.aimall_backend.seller.orders.shipments.create(
      connection,
      {
        orderId: order.id,
        body: {
          order_id: order.id,
          shipment_address_id: addressId,
          carrier: "CJ Logistics",
          shipment_status: "shipped",
        } satisfies IAimallBackendShipment.ICreate,
      },
    );
  typia.assert(shipment);

  // 5. As Customer B, attempt to access shipment details of Customer A's order
  await TestValidator.error(
    "Unauthorized customer should not retrieve shipment details",
  )(async () => {
    await api.functional.aimall_backend.customer.orders.shipments.at(
      connection,
      {
        orderId: order.id,
        shipmentId: shipment.id,
      },
    );
  });
}
