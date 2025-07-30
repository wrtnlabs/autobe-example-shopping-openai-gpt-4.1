import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrder";
import type { IAimallBackendOrderSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrderSnapshot";

/**
 * Validate audit trail integrity by creating two snapshots for the same order
 * sequentially.
 *
 * This test ensures that:
 *
 * 1. An order can have multiple snapshots created at different points in time.
 * 2. The first snapshot reflects the order state at its point of capture.
 * 3. The second snapshot, created after simulating a change, is distinctly
 *    persisted, does not overwrite the first, and both can be retrieved.
 * 4. The snapshot audit records are distinct (IDs and timestamps differ,
 *    snapshot_data reflects intended changes for audit traceability).
 *
 * Test Steps:
 *
 * 1. Create an order for snapshotting.
 * 2. Create the first order snapshot with initial state (e.g., order_status =
 *    'pending').
 * 3. Simulate an order update event (e.g., manually change status in test to
 *    'paid') and create a second snapshot with the modified state.
 * 4. Assert both snapshots exist, have different IDs and snapshot_at timestamps,
 *    and snapshot_data contents correlate with the respective event
 *    (pending/paid).
 * 5. Optionally, try to retrieve all snapshots for the order if such endpoint
 *    exists (if unavailable, validate both API responses/manual matching in
 *    test).
 */
export async function test_api_aimall_backend_administrator_orders_orderSnapshots_test_create_duplicate_order_snapshot_and_validate_audit_log(
  connection: api.IConnection,
) {
  // 1. Create an order for snapshotting
  const orderInput: IAimallBackendOrder.ICreate = {
    customer_id: typia.random<string & tags.Format<"uuid">>(),
    seller_id: typia.random<string & tags.Format<"uuid">>(),
    address_id: typia.random<string & tags.Format<"uuid">>(),
    order_number: `ORD-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-E2E`,
    order_status: "pending",
    total_amount: 25000,
    currency: "KRW",
  };
  const order = await api.functional.aimall_backend.administrator.orders.create(
    connection,
    { body: orderInput },
  );
  typia.assert(order);

  // 2. Create the first snapshot (status 'pending')
  const firstSnapshotInput: IAimallBackendOrderSnapshot.ICreate = {
    order_id: order.id,
    snapshot_type: "created",
    snapshot_data: JSON.stringify({ ...order, event: "created" }),
    snapshot_at: new Date().toISOString(),
  };
  const snapshot1 =
    await api.functional.aimall_backend.administrator.orders.orderSnapshots.create(
      connection,
      {
        orderId: order.id,
        body: firstSnapshotInput,
      },
    );
  typia.assert(snapshot1);

  // Wait so the second snapshot's snapshot_at definitely differs
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // 3. Simulate order status transition to 'paid' and create second snapshot
  const modifiedOrder = { ...order, order_status: "paid" };
  const secondSnapshotInput: IAimallBackendOrderSnapshot.ICreate = {
    order_id: order.id,
    snapshot_type: "modified",
    snapshot_data: JSON.stringify({ ...modifiedOrder, event: "paid" }),
    snapshot_at: new Date().toISOString(),
  };
  const snapshot2 =
    await api.functional.aimall_backend.administrator.orders.orderSnapshots.create(
      connection,
      {
        orderId: order.id,
        body: secondSnapshotInput,
      },
    );
  typia.assert(snapshot2);

  // 4. Assert both snapshots are distinct and correlate with correct event states
  TestValidator.notEquals("snapshots have distinct IDs")(snapshot1.id)(
    snapshot2.id,
  );
  TestValidator.notEquals("snapshots have distinct snapshot_at")(
    snapshot1.snapshot_at,
  )(snapshot2.snapshot_at);
  TestValidator.equals("first snapshot is 'pending'")(
    JSON.parse(snapshot1.snapshot_data).order_status,
  )("pending");
  TestValidator.equals("second snapshot is 'paid'")(
    JSON.parse(snapshot2.snapshot_data).order_status,
  )("paid");
}
