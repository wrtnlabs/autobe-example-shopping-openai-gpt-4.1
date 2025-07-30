import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrder";
import type { IAimallBackendOrderSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrderSnapshot";

/**
 * Test administrator creates an order snapshot with valid data for
 * audit/compliance.
 *
 * This test simulates end-to-end administrator workflow to verify order audit
 * history:
 *
 * 1. Create an order (provides a valid orderId)
 * 2. Create a snapshot for that order, using required fields and correct formats
 * 3. Ensure the snapshot is persisted and its data matches the order at the time
 *    of snapshot
 *
 * Steps:
 *
 * 1. Prepare valid order creation input per IAimallBackendOrder.ICreate and create
 *    it
 * 2. Prepare IAimallBackendOrderSnapshot.ICreate, referencing the order's id
 *
 *    - Use order_id = order.id, snapshot_type = 'created', snapshot_data = JSON
 *         string of order, snapshot_at = now
 * 3. Call snapshot create API and assert success
 * 4. Validate snapshot fields reflect the expected state of the order
 */
export async function test_api_aimall_backend_administrator_orders_orderSnapshots_test_create_order_snapshot_with_valid_data(
  connection: api.IConnection,
) {
  // 1. Create a new order
  const orderCreateInput: IAimallBackendOrder.ICreate = {
    customer_id: typia.random<string & tags.Format<"uuid">>(),
    seller_id: typia.random<string & tags.Format<"uuid">>(),
    address_id: typia.random<string & tags.Format<"uuid">>(),
    order_number: `ORD-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${typia.random<number & tags.Minimum<1> & tags.Maximum<9999>>().toString()}`,
    order_status: "pending",
    total_amount: 33000,
    currency: "KRW",
  };
  const order = await api.functional.aimall_backend.administrator.orders.create(
    connection,
    { body: orderCreateInput },
  );
  typia.assert(order);

  // 2. Prepare a valid snapshot request for the just-created order
  const snapshotInput: IAimallBackendOrderSnapshot.ICreate = {
    order_id: order.id,
    snapshot_type: "created",
    snapshot_data: JSON.stringify(order),
    snapshot_at: new Date().toISOString(),
  };

  // 3. Create the order snapshot
  const snapshot =
    await api.functional.aimall_backend.administrator.orders.orderSnapshots.create(
      connection,
      {
        orderId: order.id,
        body: snapshotInput,
      },
    );
  typia.assert(snapshot);

  // 4. Validate snapshot reflects order and correctness
  TestValidator.equals("snapshot.order_id matches")(snapshot.order_id)(
    order.id,
  );
  TestValidator.equals("snapshot_type is created")(snapshot.snapshot_type)(
    "created",
  );
  TestValidator.equals("snapshot data matches order JSON")(
    snapshot.snapshot_data,
  )(JSON.stringify(order));
  TestValidator.predicate("snapshot timestamp is ISO 8601")(
    !!snapshot.snapshot_at && !isNaN(Date.parse(snapshot.snapshot_at)),
  );
}
