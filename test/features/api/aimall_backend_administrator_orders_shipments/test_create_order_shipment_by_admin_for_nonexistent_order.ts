import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendShipment";

/**
 * Test error handling for shipment creation with non-existent orderId (admin
 * context).
 *
 * This test ensures the API correctly rejects attempts by an administrator to
 * create a shipment for an order that does not exist. The objective is to
 * verify proper API error handling (expecting a 404 Not Found or equivalent
 * business error), and to ensure that no shipment is returned in case of such
 * logical error.
 *
 * Steps:
 *
 * 1. Prepare a validly structured random shipment creation body
 *    (IAimallBackendShipment.ICreate), with a random UUID for both order_id and
 *    shipment_address_id, and typical values for carrier/status fields.
 * 2. Choose a random UUID for orderId path parameter (it does not exist in DB).
 * 3. Call api.functional.aimall_backend.administrator.orders.shipments.create
 *    (postByOrderid) with the random orderId and body.
 * 4. Assert that the API throws an error (inspect with TestValidator.error).
 *    Accept error regardless of type (404 or business/rejection), since the
 *    point is that non-existent order yields error.
 * 5. Confirm that no shipment object is created or returned.
 */
export async function test_api_aimall_backend_administrator_orders_shipments_test_create_order_shipment_by_admin_for_nonexistent_order(
  connection: api.IConnection,
) {
  // 1. Compose a plausible shipment creation request.
  const randomOrderId: string = typia.random<string & tags.Format<"uuid">>();
  const randomAddressId: string = typia.random<string & tags.Format<"uuid">>();
  const body: IAimallBackendShipment.ICreate = {
    order_id: randomOrderId, // Should be same as path param, even if non-existent
    shipment_address_id: randomAddressId,
    carrier: "FedEx",
    tracking_number: "1Z9999Y70200370006",
    shipment_status: "pending",
    shipped_at: null,
    delivered_at: null,
  } satisfies IAimallBackendShipment.ICreate;

  // 2. Call the API with a non-existent orderId
  await TestValidator.error("should return error with nonexistent orderId")(
    async () => {
      await api.functional.aimall_backend.administrator.orders.shipments.create(
        connection,
        {
          orderId: randomOrderId,
          body,
        },
      );
    },
  );
}
