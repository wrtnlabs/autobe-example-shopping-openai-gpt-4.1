import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrder";
import type { IAimallBackendShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendShipment";

/**
 * Validates successful deletion of a shipment record for an order as
 * administrator, including audit constraints and error checks.
 *
 * This test simulates a real administrative workflow to ensure that deleting a
 * shipment event linked to an order is processed correctly:
 *
 * 1. Create a new order using the administrator orders endpoint (prerequisite for
 *    having an order to attach a shipment)
 * 2. Add a shipment to that order using the shipment creation endpoint
 *    (prerequisite for testing deletion)
 * 3. Delete the shipment by shipmentId via the shipment deletion endpoint
 * 4. Attempt to retrieve/check the deleted shipment to confirm it no longer
 *    exists/returns a not found error (if retrieval endpoint exists, or catch
 *    error on direct reference if not)
 * 5. (Implicit) Validate compliance/audit requirements by confirming the endpoint
 *    behavior guarantees hard delete as described in business
 *
 * If any API call fails, assertions will make it clear where the flow or
 * business logic broke down.
 */
export async function test_api_aimall_backend_administrator_orders_shipments_test_delete_shipment_for_existing_order_as_admin(
  connection: api.IConnection,
) {
  // 1. Create a new order (prerequisite)
  const order: IAimallBackendOrder =
    await api.functional.aimall_backend.administrator.orders.create(
      connection,
      {
        body: {
          customer_id: typia.random<string & tags.Format<"uuid">>(),
          seller_id: typia.random<string & tags.Format<"uuid">>(),
          address_id: typia.random<string & tags.Format<"uuid">>(),
          order_status: "pending",
          total_amount: 110000,
          currency: "KRW",
          order_number: `ORD-${new Date().toISOString().substring(0, 10).replace(/-/g, "")}-${typia.random<number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<9999>>()}`,
        } satisfies IAimallBackendOrder.ICreate,
      },
    );
  typia.assert(order);

  // 2. Add a shipment attached to the order
  const shipment: IAimallBackendShipment =
    await api.functional.aimall_backend.administrator.orders.shipments.create(
      connection,
      {
        orderId: order.id,
        body: {
          order_id: order.id,
          shipment_address_id: order.address_id,
          carrier: "CJ Logistics",
          tracking_number: `1Z${typia.random<string>().slice(0, 16)}`,
          shipment_status: "pending",
          shipped_at: null,
          delivered_at: null,
        } satisfies IAimallBackendShipment.ICreate,
      },
    );
  typia.assert(shipment);

  // 3. Delete the shipment
  await api.functional.aimall_backend.administrator.orders.shipments.erase(
    connection,
    {
      orderId: order.id,
      shipmentId: shipment.id,
    },
  );

  // 4. Attempt to retrieve deleted shipment (if retrieval endpoint is present) or expect further operations to fail
  // Since no get endpoint for a single shipment is provided, test that a second delete throws error (as a proxy for absence)
  await TestValidator.error(
    "Deleting already-deleted shipment should return error",
  )(async () => {
    await api.functional.aimall_backend.administrator.orders.shipments.erase(
      connection,
      {
        orderId: order.id,
        shipmentId: shipment.id,
      },
    );
  });
}
