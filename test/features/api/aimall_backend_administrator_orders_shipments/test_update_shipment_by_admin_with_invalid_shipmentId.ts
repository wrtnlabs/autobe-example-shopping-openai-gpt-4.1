import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrder";
import type { IAimallBackendShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendShipment";

/**
 * Attempt to update a shipment with a non-existent shipmentId as admin.
 *
 * This test verifies that when an administrator tries to update a shipment
 * using a random, non-existent shipmentId (for a valid order), the system
 * returns an error (e.g., 404 Not Found) and does _not_ modify any shipment
 * data.
 *
 * Steps:
 *
 * 1. Create a valid order (dependency setup).
 * 2. Use a random UUID as the (non-existent) shipmentId.
 * 3. Attempt to update the shipment with valid update data.
 * 4. Assert that an error is thrown (API does not update or create data for the
 *    invalid shipmentId).
 */
export async function test_api_aimall_backend_administrator_orders_shipments_test_update_shipment_by_admin_with_invalid_shipmentId(
  connection: api.IConnection,
) {
  // 1. Create a valid order for test context
  const order = await api.functional.aimall_backend.administrator.orders.create(
    connection,
    {
      body: {
        customer_id: typia.random<string & tags.Format<"uuid">>(),
        seller_id: typia.random<string & tags.Format<"uuid">>(),
        address_id: typia.random<string & tags.Format<"uuid">>(),
        order_status: "pending",
        total_amount: 10000,
        currency: "KRW",
      } satisfies IAimallBackendOrder.ICreate,
    },
  );
  typia.assert(order);

  // 2. Generate a random, non-existent shipmentId for negative scenario
  const nonExistentShipmentId = typia.random<string & tags.Format<"uuid">>();

  // 3. Compose valid update DTO for test (all fields set)
  const updateInput: IAimallBackendShipment.IUpdate = {
    carrier: "CJ Logistics",
    tracking_number: "1234567890",
    shipment_status: "shipped",
    shipped_at: new Date().toISOString(),
    delivered_at: null,
  };

  // 4. Assert that update fails with error (not found / does not modify)
  await TestValidator.error("Should throw error for invalid shipmentId")(
    async () => {
      await api.functional.aimall_backend.administrator.orders.shipments.update(
        connection,
        {
          orderId: order.id,
          shipmentId: nonExistentShipmentId,
          body: updateInput,
        },
      );
    },
  );
}
