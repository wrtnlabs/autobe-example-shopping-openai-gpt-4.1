import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrder";
import type { IAimallBackendOrderSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrderSnapshot";

/**
 * Validate successful hard deletion of an audit snapshot for an order by an
 * administrator.
 *
 * Business Context: Snapshots of order state are created for audit and
 * compliance. Occasionally, administrators must hard-delete a specific audit
 * history record.
 *
 * This test performs the following E2E workflow:
 *
 * 1. Programmatically create a valid order with business-required fields.
 * 2. Create an audit snapshot for the new order.
 * 3. Delete that snapshot by ID.
 * 4. (Optional) Note: Since there is no API endpoint to retrieve or list snapshots
 *    for this order, we cannot directly assert removal.
 *
 * At each step, type assertions guarantee the schema is respected. Placement of
 * all required fields in the create and erase functions strictly follows the
 * provided DTO and SDK definitions.
 */
export async function test_api_aimall_backend_administrator_orders_orderSnapshots_test_delete_order_snapshot_success(
  connection: api.IConnection,
) {
  // 1. Create an order with all required fields
  const order = await api.functional.aimall_backend.administrator.orders.create(
    connection,
    {
      body: {
        customer_id: typia.random<string & tags.Format<"uuid">>(),
        seller_id: typia.random<string & tags.Format<"uuid">>(),
        address_id: typia.random<string & tags.Format<"uuid">>(),
        order_status: "pending",
        total_amount: 50000,
        currency: "KRW",
      } satisfies IAimallBackendOrder.ICreate,
    },
  );
  typia.assert(order);

  // 2. Create a snapshot for this order
  const snapshot =
    await api.functional.aimall_backend.administrator.orders.orderSnapshots.create(
      connection,
      {
        orderId: order.id,
        body: {
          order_id: order.id,
          snapshot_type: "created",
          snapshot_data: JSON.stringify(order),
          snapshot_at: new Date().toISOString(),
        } satisfies IAimallBackendOrderSnapshot.ICreate,
      },
    );
  typia.assert(snapshot);

  // 3. Hard delete the snapshot
  await api.functional.aimall_backend.administrator.orders.orderSnapshots.erase(
    connection,
    {
      orderId: order.id,
      orderSnapshotId: snapshot.id,
    },
  );
  // 4. No GET endpoint for snapshot: can't directly test nonexistence
}
