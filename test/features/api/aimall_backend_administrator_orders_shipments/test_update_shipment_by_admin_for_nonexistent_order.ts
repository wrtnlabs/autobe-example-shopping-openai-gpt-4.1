import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendShipment";

/**
 * Validate updating a shipment as an administrator for a non-existent order.
 *
 * This test verifies that when an administrator attempts to update a shipment
 * with an orderId that does not exist (but a shipmentId that is in correct
 * format), the API returns an error, and no shipment data is changed in the
 * system. The purpose is to confirm proper error handling for unknown order
 * references and robust business rule validation at the API boundary.
 *
 * Step-by-step process:
 *
 * 1. Generate a random UUID for orderId (ensuring it does not correspond to any
 *    real order)
 * 2. Generate a random UUID for shipmentId (just in correct format; real existence
 *    is irrelevant for this test)
 * 3. Prepare typical update data for the shipment (e.g., carrier/shipment_status
 *    update)
 * 4. Attempt to update the shipment as administrator using the API
 * 5. Verify an error is returned (not found or business rule error)
 * 6. Confirm that no shipment data is modified as a result of this invalid orderId
 *    update
 */
export async function test_api_aimall_backend_administrator_orders_shipments_test_update_shipment_by_admin_for_nonexistent_order(
  connection: api.IConnection,
) {
  // 1. Generate a random non-existent orderId
  const orderId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 2. Generate a shipmentId in proper format (no existence guarantee)
  const shipmentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Prepare update data (typical shipment update — use only available DTO fields)
  const updateData: IAimallBackendShipment.IUpdate = {
    carrier: "CJ Logistics",
    shipment_status: "shipped",
    shipped_at: new Date().toISOString(),
    delivered_at: null,
    tracking_number: "CJ1234567890",
  };

  // 4. Attempt to update the shipment (expect error due to non-existent orderId)
  await TestValidator.error("Should throw error for non-existent orderId")(
    async () => {
      await api.functional.aimall_backend.administrator.orders.shipments.update(
        connection,
        {
          orderId,
          shipmentId,
          body: updateData,
        },
      );
    },
  );
}
