import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrder";
import type { IPageIAimallBackendOrderSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendOrderSnapshot";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAimallBackendOrderSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrderSnapshot";

/**
 * Verify that administrators can retrieve all audit snapshots for any order,
 * regardless of who the customer or seller is.
 *
 * Business context: Administrators need to see all history for any order to
 * support audits, disputes, compliance, or troubleshooting. Snapshots capture
 * complete order states throughout the order lifecycle, covering all
 * significant events.
 *
 * Test process:
 *
 * 1. Create a new order via admin API.
 * 2. Simulate lifecycle snapshots for the order by posting multiple distinct
 *    snapshot entries for various events (e.g., 'created', 'modified',
 *    'cancelled'). Ensure each snapshot has a unique type and data payload.
 * 3. Retrieve all snapshots for that order using the admin endpoint.
 * 4. Assert that all sent snapshots are present and correct (by id, type, and
 *    payload) in the returned snapshot list (disregard order, but all must
 *    exist and match).
 */
export async function test_api_aimall_backend_administrator_orders_orderSnapshots_index(
  connection: api.IConnection,
) {
  // 1. Create a new order as base for snapshot history
  const order: IAimallBackendOrder =
    await api.functional.aimall_backend.administrator.orders.create(
      connection,
      {
        body: {
          customer_id: typia.random<string & tags.Format<"uuid">>(),
          seller_id: typia.random<string & tags.Format<"uuid">>(),
          address_id: typia.random<string & tags.Format<"uuid">>(),
          order_status: "pending",
          total_amount: 150000,
          currency: "KRW",
          order_number: `ORD-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-E2E1`,
        } satisfies IAimallBackendOrder.ICreate,
      },
    );
  typia.assert(order);

  // 2. Post several lifecycle snapshots for this order
  const snapshotInputs: IAimallBackendOrderSnapshot.ICreate[] = [
    {
      order_id: order.id,
      snapshot_type: "created",
      snapshot_data: JSON.stringify({
        status: "pending",
        comment: "Order created",
      }),
      snapshot_at: new Date(Date.now() - 60000).toISOString(), // 1 min ago
    },
    {
      order_id: order.id,
      snapshot_type: "modified",
      snapshot_data: JSON.stringify({
        status: "processing",
        comment: "Order modified by admin",
      }),
      snapshot_at: new Date(Date.now() - 30000).toISOString(), // 30s ago
    },
    {
      order_id: order.id,
      snapshot_type: "cancelled",
      snapshot_data: JSON.stringify({
        status: "cancelled",
        comment: "Order cancelled by customer",
      }),
      snapshot_at: new Date().toISOString(),
    },
  ];
  const snapshots: IAimallBackendOrderSnapshot[] = [];
  for (const input of snapshotInputs) {
    const snap =
      await api.functional.aimall_backend.administrator.orders.orderSnapshots.create(
        connection,
        { orderId: order.id, body: input },
      );
    typia.assert(snap);
    snapshots.push(snap);
  }

  // 3. Retrieve all snapshots for this order as admin
  const page =
    await api.functional.aimall_backend.administrator.orders.orderSnapshots.index(
      connection,
      { orderId: order.id },
    );
  typia.assert(page);
  TestValidator.predicate("Admin must see all snapshots")(
    Array.isArray(page.data) &&
      snapshots.every(({ id, snapshot_type, snapshot_data, snapshot_at }) =>
        page.data!.some(
          (s) =>
            s.id === id &&
            s.snapshot_type === snapshot_type &&
            s.snapshot_data === snapshot_data &&
            s.snapshot_at === snapshot_at,
        ),
      ),
  );
}
