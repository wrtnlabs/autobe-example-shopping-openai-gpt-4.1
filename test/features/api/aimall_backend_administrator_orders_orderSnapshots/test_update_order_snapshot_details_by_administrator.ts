import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrder";
import type { IAimallBackendOrderSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrderSnapshot";

/**
 * Validate that an administrator can update modifiable fields of an existing
 * order audit snapshot, while ensuring immutable fields are protected.
 *
 * This test simulates the audit update workflow as follows:
 *
 * 1. Create a new order via administrator API (setup dependency).
 * 2. Create a snapshot record for the order, representing an audit event (setup
 *    dependency).
 * 3. As administrator, perform a snapshot update via PUT to update only fields
 *    allowed by schema (e.g., snapshot_type and snapshot_data, snapshot_at).
 * 4. Assert that only the specified fields change as expected and that truly
 *    immutable index or audit fields (ids, order references) do not change.
 * 5. Attempt to update requiring invalid field changes, or change fields on a
 *    finalized record (not possible here due to schema: skip, as business logic
 *    is not codified for 'finalized').
 */
export async function test_api_aimall_backend_administrator_orders_orderSnapshots_test_update_order_snapshot_details_by_administrator(
  connection: api.IConnection,
) {
  // Step 1: Create an order for setup
  const orderCreate: IAimallBackendOrder =
    await api.functional.aimall_backend.administrator.orders.create(
      connection,
      {
        body: {
          customer_id: typia.random<string & tags.Format<"uuid">>(),
          seller_id: typia.random<string & tags.Format<"uuid">>(),
          address_id: typia.random<string & tags.Format<"uuid">>(),
          order_number: undefined, // Let system generate
          order_status: "pending",
          total_amount: 100000,
          currency: "KRW",
        } satisfies IAimallBackendOrder.ICreate,
      },
    );
  typia.assert(orderCreate);

  // Step 2: Create an initial audit snapshot
  const snapshotCreate: IAimallBackendOrderSnapshot =
    await api.functional.aimall_backend.administrator.orders.orderSnapshots.create(
      connection,
      {
        orderId: orderCreate.id,
        body: {
          order_id: orderCreate.id,
          snapshot_type: "created",
          snapshot_data: JSON.stringify(orderCreate),
          snapshot_at: new Date().toISOString(),
        } satisfies IAimallBackendOrderSnapshot.ICreate,
      },
    );
  typia.assert(snapshotCreate);

  // Step 3: Update the snapshot with new fields
  const updateBody: IAimallBackendOrderSnapshot.IUpdate = {
    snapshot_type: "audit_correction",
    snapshot_data: JSON.stringify({
      ...orderCreate,
      order_status: "corrected",
    }),
    snapshot_at: new Date(Date.now() + 10000).toISOString(), // simulate a slightly later date
  };

  const snapshotUpdated: IAimallBackendOrderSnapshot =
    await api.functional.aimall_backend.administrator.orders.orderSnapshots.update(
      connection,
      {
        orderId: orderCreate.id,
        orderSnapshotId: snapshotCreate.id,
        body: updateBody,
      },
    );
  typia.assert(snapshotUpdated);

  // Step 4: Assertions - updated fields reflect changes, immutable fields unchanged
  TestValidator.equals("Snapshot ID remains unchanged")(snapshotUpdated.id)(
    snapshotCreate.id,
  );
  TestValidator.equals("Order ID remains unchanged")(snapshotUpdated.order_id)(
    orderCreate.id,
  );
  TestValidator.notEquals("Snapshot type changed")(
    snapshotUpdated.snapshot_type,
  )(snapshotCreate.snapshot_type);
  TestValidator.equals("Snapshot type matches update")(
    snapshotUpdated.snapshot_type,
  )(updateBody.snapshot_type);
  TestValidator.notEquals("Snapshot data changed")(
    snapshotUpdated.snapshot_data,
  )(snapshotCreate.snapshot_data);
  TestValidator.equals("Snapshot data matches update")(
    snapshotUpdated.snapshot_data,
  )(updateBody.snapshot_data);
  TestValidator.notEquals("Snapshot at changed")(snapshotUpdated.snapshot_at)(
    snapshotCreate.snapshot_at,
  );
  TestValidator.equals("Snapshot at matches update")(
    snapshotUpdated.snapshot_at,
  )(updateBody.snapshot_at);

  // Step 5: Attempt updating with no actual updatable fields (should not error, but result in no change)
  const noOpUpdate: IAimallBackendOrderSnapshot.IUpdate = {};
  const snapshotNoOp: IAimallBackendOrderSnapshot =
    await api.functional.aimall_backend.administrator.orders.orderSnapshots.update(
      connection,
      {
        orderId: orderCreate.id,
        orderSnapshotId: snapshotCreate.id,
        body: noOpUpdate,
      },
    );
  typia.assert(snapshotNoOp);
  TestValidator.equals("No-op update yields current state")(snapshotNoOp)(
    snapshotUpdated,
  );
}
