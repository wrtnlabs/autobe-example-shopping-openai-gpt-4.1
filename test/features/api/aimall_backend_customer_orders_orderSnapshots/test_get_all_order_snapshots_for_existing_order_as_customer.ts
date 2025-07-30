import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrder";
import type { IPageIAimallBackendOrderSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendOrderSnapshot";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAimallBackendOrderSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrderSnapshot";

/**
 * Validate retrieval of all audit snapshots for a specific order (as customer).
 *
 * Business context:
 *
 * - This test verifies a customer can fetch the full audit trail (snapshots) for
 *   their own order.
 * - Snapshots are created at various change points. We will simulate these by
 *   manually invoking the snapshot creation as admin after order creation and
 *   again after a simulated order status update.
 * - The test will ensure only snapshots for orders belonging to the acting
 *   customer are accessible for that user context.
 *
 * Steps:
 *
 * 1. Create a new order as a customer (via customer order create API).
 * 2. Manually (as admin) insert at least two audit snapshots for this order using
 *    the POST snapshot endpoint (simulate changes via snapshot_type: 'created'
 *    and 'status_changed').
 * 3. As customer, call the GET orderSnapshots endpoint to retrieve all snapshots
 *    for the order.
 * 4. Validate at least two snapshots are present, and their snapshot_type and
 *    serialized data reflect their creation intent.
 * 5. Confirm all snapshot.order_id match the test order and (optionally) order of
 *    snapshot creation via snapshot_at timestamps.
 */
export async function test_api_aimall_backend_customer_orders_orderSnapshots_index(
  connection: api.IConnection,
) {
  // 1. Create a new order as a customer
  const customer_id = typia.random<string & tags.Format<"uuid">>();
  const seller_id = typia.random<string & tags.Format<"uuid">>();
  const address_id = typia.random<string & tags.Format<"uuid">>();
  const order: IAimallBackendOrder =
    await api.functional.aimall_backend.customer.orders.create(connection, {
      body: {
        customer_id,
        seller_id,
        address_id,
        order_status: "pending",
        total_amount: 10000,
        currency: "KRW",
      } satisfies IAimallBackendOrder.ICreate,
    });
  typia.assert(order);

  // 2. As admin, create two audit snapshots for the order
  // 2a. First snapshot - order created
  const baseTime = new Date();
  const snapshot1 =
    await api.functional.aimall_backend.administrator.orders.orderSnapshots.create(
      connection,
      {
        orderId: order.id,
        body: {
          order_id: order.id,
          snapshot_type: "created",
          snapshot_data: JSON.stringify(order),
          snapshot_at: new Date(baseTime.getTime()).toISOString(),
        } satisfies IAimallBackendOrderSnapshot.ICreate,
      },
    );
  typia.assert(snapshot1);

  // Simulate order status change
  order.order_status = "processing";

  // 2b. Second snapshot - status changed (simulate 1 second later for timestamp)
  const snapshot2 =
    await api.functional.aimall_backend.administrator.orders.orderSnapshots.create(
      connection,
      {
        orderId: order.id,
        body: {
          order_id: order.id,
          snapshot_type: "status_changed",
          snapshot_data: JSON.stringify(order),
          snapshot_at: new Date(baseTime.getTime() + 1000).toISOString(),
        } satisfies IAimallBackendOrderSnapshot.ICreate,
      },
    );
  typia.assert(snapshot2);

  // 3. As customer, retrieve all order snapshots
  const page =
    await api.functional.aimall_backend.customer.orders.orderSnapshots.index(
      connection,
      {
        orderId: order.id,
      },
    );
  typia.assert(page);
  const snapshots = page.data ?? [];
  TestValidator.predicate("at least 2 snapshots present")(
    snapshots.length >= 2,
  );
  for (const s of snapshots) {
    TestValidator.equals("order id matches")(s.order_id)(order.id);
  }
  // Optionally check snapshot types
  const types = snapshots.map((s) => s.snapshot_type);
  TestValidator.predicate("found created and status_changed types")(
    types.includes("created") && types.includes("status_changed"),
  );
}
