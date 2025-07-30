import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrder";
import type { IPageIAimallBackendOrderSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendOrderSnapshot";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAimallBackendOrderSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrderSnapshot";

/**
 * Validate that a seller can retrieve all audit/order history snapshots for an
 * order they manage.
 *
 * This test ensures that a seller, after creating and managing an order, is
 * able to fetch the snapshot (audit/event) history for that order only. It
 * validates that:
 *
 * - Only snapshots for the seller's own order are returned
 * - Snapshots reflect all relevant state/audit changes (including manual/admin
 *   snapshot entries)
 * - No snapshots from other sellers' orders are included (basic privacy boundary)
 *
 * Steps:
 *
 * 1. Create an order as the seller.
 * 2. Trigger several snapshot records for the order via admin action (simulate
 *    events).
 * 3. Query all order snapshots for that order (as the seller) via their endpoint.
 * 4. Validate that all returned snapshots are for the same order_id and match the
 *    ones created.
 * 5. (Privacy check) Create a second order and snapshot. Fetch snapshots for the
 *    first order again to ensure only snapshots for the first order are
 *    returned.
 */
export async function test_api_aimall_backend_seller_orders_orderSnapshots_index(
  connection: api.IConnection,
) {
  // 1. Create a new order as a seller
  const sellerOrder = await api.functional.aimall_backend.seller.orders.create(
    connection,
    {
      body: {
        customer_id: typia.random<string & tags.Format<"uuid">>(),
        seller_id: typia.random<string & tags.Format<"uuid">>(),
        address_id: typia.random<string & tags.Format<"uuid">>(),
        order_status: "pending",
        total_amount: 100000,
        currency: "KRW",
      } satisfies IAimallBackendOrder.ICreate,
    },
  );
  typia.assert(sellerOrder);

  // 2. Simulate business events by creating two order snapshots (admin-triggered)
  const snapshot1 =
    await api.functional.aimall_backend.administrator.orders.orderSnapshots.create(
      connection,
      {
        orderId: sellerOrder.id,
        body: {
          order_id: sellerOrder.id,
          snapshot_type: "created",
          snapshot_data: JSON.stringify(sellerOrder),
          snapshot_at: new Date().toISOString(),
        } satisfies IAimallBackendOrderSnapshot.ICreate,
      },
    );
  typia.assert(snapshot1);

  const orderPaid = { ...sellerOrder, order_status: "paid" };
  const snapshot2 =
    await api.functional.aimall_backend.administrator.orders.orderSnapshots.create(
      connection,
      {
        orderId: sellerOrder.id,
        body: {
          order_id: sellerOrder.id,
          snapshot_type: "status_updated",
          snapshot_data: JSON.stringify(orderPaid),
          snapshot_at: new Date(Date.now() + 1000).toISOString(),
        } satisfies IAimallBackendOrderSnapshot.ICreate,
      },
    );
  typia.assert(snapshot2);

  // 3. Seller queries all order snapshots for that order
  const snapshotPage =
    await api.functional.aimall_backend.seller.orders.orderSnapshots.index(
      connection,
      {
        orderId: sellerOrder.id,
      },
    );
  typia.assert(snapshotPage);

  // 4. Validate all returned snapshots are for the right order and expected set is present
  TestValidator.predicate("all entries belong to the seller's order")(
    (snapshotPage.data ?? []).every((s) => s.order_id === sellerOrder.id),
  );
  TestValidator.predicate("all created snapshots returned")(
    [snapshot1.id, snapshot2.id].every((id) =>
      (snapshotPage.data ?? []).some((s) => s.id === id),
    ),
  );

  // 5. Privacy test: create another order/snapshot that should not appear here
  const anotherOrder = await api.functional.aimall_backend.seller.orders.create(
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
  typia.assert(anotherOrder);
  const anotherSnapshot =
    await api.functional.aimall_backend.administrator.orders.orderSnapshots.create(
      connection,
      {
        orderId: anotherOrder.id,
        body: {
          order_id: anotherOrder.id,
          snapshot_type: "created",
          snapshot_data: JSON.stringify(anotherOrder),
          snapshot_at: new Date(Date.now() + 2000).toISOString(),
        } satisfies IAimallBackendOrderSnapshot.ICreate,
      },
    );
  typia.assert(anotherSnapshot);

  const snapshotPage2 =
    await api.functional.aimall_backend.seller.orders.orderSnapshots.index(
      connection,
      {
        orderId: sellerOrder.id,
      },
    );
  typia.assert(snapshotPage2);
  TestValidator.predicate("no snapshots from other orders present")(
    (snapshotPage2.data ?? []).every((s) => s.order_id === sellerOrder.id),
  );
  TestValidator.predicate("another order's snapshot is absent")(
    !(snapshotPage2.data ?? []).some((s) => s.id === anotherSnapshot.id),
  );
}
