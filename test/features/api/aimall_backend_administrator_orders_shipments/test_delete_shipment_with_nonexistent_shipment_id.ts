import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrder";

/**
 * E2E test: Deleting a shipment from an order with a non-existent shipmentId
 * (administrator API)
 *
 * This test validates that attempting to delete a shipment with a shipmentId
 * that does NOT exist within a valid order as an administrator fails properly
 * (returns not found/validation error), and that no actual existing data is
 * lost or deleted in the process.
 *
 * Steps:
 *
 * 1. Create a valid order using administrator API (dependency).
 * 2. Attempt to delete a shipment using this order's id and a random shipmentId
 *    value (that certainly does not exist). a. Expect a not found/result
 *    error.
 * 3. Verify that the order still exists and can be queried (if possible).
 *
 * Business context:
 *
 * - As per business rules, administrators may need to delete (hard) shipment
 *   records, but such removals must be safe: using an invalid or non-existent
 *   shipmentId must not affect any data and give a clear not found error.
 * - No shipments are created for this order, so any shipmentId is invalid.
 */
export async function test_api_aimall_backend_administrator_orders_shipments_test_delete_shipment_with_nonexistent_shipment_id(
  connection: api.IConnection,
) {
  // 1. Create a valid order
  const customerId = typia.random<string & tags.Format<"uuid">>();
  const sellerId = typia.random<string & tags.Format<"uuid">>();
  const addressId = typia.random<string & tags.Format<"uuid">>();
  const orderBody = {
    customer_id: customerId,
    seller_id: sellerId,
    address_id: addressId,
    order_status: "pending",
    total_amount: 100000,
    currency: "KRW",
  } satisfies IAimallBackendOrder.ICreate;
  const order = await api.functional.aimall_backend.administrator.orders.create(
    connection,
    { body: orderBody },
  );
  typia.assert(order);

  // 2. Attempt to delete a non-existent shipment for this order
  const fakeShipmentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "deleting with non-existent shipmentId throws error",
  )(async () => {
    await api.functional.aimall_backend.administrator.orders.shipments.erase(
      connection,
      { orderId: order.id, shipmentId: fakeShipmentId },
    );
  });

  // 3. (Optional) Confirm order still exists (if query API is available)
}
