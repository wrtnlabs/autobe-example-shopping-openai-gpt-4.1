import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAimallBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrder";
import type { IAimallBackendShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendShipment";

/**
 * Test retrieving a nonexistent shipment detail for a valid order.
 *
 * This test verifies the system's behavior when a customer attempts to fetch
 * shipment details using a valid orderId, but supplies a shipmentId that is
 * either randomly generated (never existed) or already deleted.
 *
 * Steps:
 *
 * 1. Register a new customer account (to satisfy the unique email/phone
 *    constraints).
 * 2. Create a new order for that customer using valid but artificial references
 *    for required fields (seller_id, address_id).
 * 3. Attempt to retrieve shipment details via
 *    api.functional.aimall_backend.customer.orders.shipments.at with the
 *    created orderId and a random (nonexistent) shipmentId.
 * 4. Expect the API to throw an error (404 Not Found or equivalent HttpError).
 * 5. Confirm no internal system details are leaked in error (do not assert error
 *    message content—just presence of an error).
 *
 * This validates the endpoint's error handling for accessing nonexistent
 * shipment records, ensuring no sensitive data is exposed through error
 * responses.
 */
export async function test_api_aimall_backend_customer_orders_shipments_test_retrieve_shipment_detail_for_nonexistent_shipment(
  connection: api.IConnection,
) {
  // 1. Register a new customer
  const customer = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        phone: RandomGenerator.mobile(),
        status: "active",
      } satisfies IAimallBackendCustomer.ICreate,
    },
  );
  typia.assert(customer);

  // 2. Create a new order for the customer, with synthetic references
  const order = await api.functional.aimall_backend.customer.orders.create(
    connection,
    {
      body: {
        customer_id: customer.id,
        seller_id: typia.random<string & tags.Format<"uuid">>(),
        address_id: typia.random<string & tags.Format<"uuid">>(),
        order_status: "pending",
        total_amount: typia.random<
          number &
            tags.Type<"uint32"> &
            tags.Minimum<10000> &
            tags.Maximum<50000>
        >(),
        currency: "KRW",
      } satisfies IAimallBackendOrder.ICreate,
    },
  );
  typia.assert(order);

  // 3. Try to get a random/nonexistent shipment for the valid order, expect an error
  const randomShipmentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("should fail with 404 or not found")(() =>
    api.functional.aimall_backend.customer.orders.shipments.at(connection, {
      orderId: order.id,
      shipmentId: randomShipmentId,
    }),
  );
}
