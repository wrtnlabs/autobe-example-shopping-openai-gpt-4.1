import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrder";
import type { IAimallBackendOrderSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrderSnapshot";
import type { IPageIAimallBackendOrderSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendOrderSnapshot";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Test searching filtered order snapshots for a customer order (with pagination
 * & different event types).
 *
 * This test simulates a realistic audit search scenario for order snapshots:
 *
 * - Creates an order as a customer,
 * - Adds three (or more) audit snapshots with different types and times as an
 *   admin,
 * - Performs filtered and paginated searches on that order's snapshot history
 *   using the PATCH endpoint.
 *
 * It validates that:
 *
 * 1. Snapshots are retrievable for this order,
 * 2. Snapshot_type-based filtering returns correct types,
 * 3. Snapshot_at time window correctly bounds results,
 * 4. Pagination (limit/page) returns correct slices and meta,
 * 5. Only this order's snapshots are returned, with all type guarantees.
 *
 * Steps:
 *
 * 1. Create a customer order via /aimall-backend/customer/orders
 * 2. (As admin) Create 3 audit snapshots, each with a different snapshot_type and
 *    timestamp
 * 3. Perform searches: a. No filter (all should appear) b. snapshot_type filter
 *    (e.g., 'fulfilled') c. Time window filter (between times of snapshot 2 &
 *    3) d. Pagination (limit:2, page:1,2)
 * 4. Validate all results against expectations
 */
export async function test_api_aimall_backend_customer_orders_orderSnapshots_search_with_filters_as_customer(
  connection: api.IConnection,
) {
  // 1. Create order as customer
  const orderCreate: IAimallBackendOrder.ICreate = {
    customer_id: typia.random<string & tags.Format<"uuid">>(),
    seller_id: typia.random<string & tags.Format<"uuid">>(),
    address_id: typia.random<string & tags.Format<"uuid">>(),
    order_status: "pending",
    total_amount: 99900,
    currency: "KRW",
    order_number: `ORD-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-001`,
  };
  const order = await api.functional.aimall_backend.customer.orders.create(
    connection,
    {
      body: orderCreate,
    },
  );
  typia.assert(order);

  // 2. As admin, create snapshots
  const baseSnapshotData = JSON.stringify(order);
  const now = new Date();
  const snapshotPayloads: IAimallBackendOrderSnapshot.ICreate[] = [
    {
      order_id: order.id,
      snapshot_type: "created",
      snapshot_data: baseSnapshotData,
      snapshot_at: new Date(now.getTime() - 60 * 60 * 1000).toISOString(), // 1hr ago
    },
    {
      order_id: order.id,
      snapshot_type: "modified",
      snapshot_data: baseSnapshotData,
      snapshot_at: new Date(now.getTime() - 30 * 60 * 1000).toISOString(), // 30min ago
    },
    {
      order_id: order.id,
      snapshot_type: "fulfilled",
      snapshot_data: baseSnapshotData,
      snapshot_at: now.toISOString(),
    },
  ];
  for (const payload of snapshotPayloads) {
    const snapshot =
      await api.functional.aimall_backend.administrator.orders.orderSnapshots.create(
        connection,
        {
          orderId: order.id,
          body: payload,
        },
      );
    typia.assert(snapshot);
    TestValidator.equals("snapshot order id matches")(snapshot.order_id)(
      order.id,
    );
  }

  // 3a. List all snapshots (no filter)
  const resultAll =
    await api.functional.aimall_backend.customer.orders.orderSnapshots.search(
      connection,
      {
        orderId: order.id,
        body: {},
      },
    );
  typia.assert(resultAll);
  TestValidator.predicate("returns all created snapshots")(
    (resultAll.data ?? []).length >= 3,
  );
  for (const snap of resultAll.data ?? []) {
    TestValidator.equals("only this order")(snap.order_id)(order.id);
  }

  // 3b. Filter by snapshot_type (e.g. 'fulfilled')
  const resultFulfilled =
    await api.functional.aimall_backend.customer.orders.orderSnapshots.search(
      connection,
      {
        orderId: order.id,
        body: { snapshot_type: "fulfilled" },
      },
    );
  typia.assert(resultFulfilled);
  for (const snap of resultFulfilled.data ?? []) {
    TestValidator.equals("snapshot_type matches")(snap.snapshot_type)(
      "fulfilled",
    );
    TestValidator.equals("order id matches")(snap.order_id)(order.id);
  }

  // 3c. Filter by time window (should return 2 snapshots)
  const lower = snapshotPayloads[1].snapshot_at;
  const upper = snapshotPayloads[2].snapshot_at;
  const resultWindow =
    await api.functional.aimall_backend.customer.orders.orderSnapshots.search(
      connection,
      {
        orderId: order.id,
        body: { snapshot_at_from: lower, snapshot_at_to: upper },
      },
    );
  typia.assert(resultWindow);
  TestValidator.predicate("window range filtering correct")(
    (resultWindow.data ?? []).every(
      (snap) => snap.snapshot_at >= lower && snap.snapshot_at <= upper,
    ),
  );

  // 3d. Pagination - limit 2, pages 1 and 2
  const resultPage1 =
    await api.functional.aimall_backend.customer.orders.orderSnapshots.search(
      connection,
      {
        orderId: order.id,
        body: { limit: 2, page: 1 },
      },
    );
  typia.assert(resultPage1);
  TestValidator.equals("page 1 count")(resultPage1.data?.length)(2);

  const resultPage2 =
    await api.functional.aimall_backend.customer.orders.orderSnapshots.search(
      connection,
      {
        orderId: order.id,
        body: { limit: 2, page: 2 },
      },
    );
  typia.assert(resultPage2);
  // page 2 may have 1 or 0 depending on total, should not repeat records from page 1
  if (
    (resultPage2.data?.length ?? 0) > 0 &&
    resultPage1.data &&
    resultPage1.data.length > 0
  ) {
    for (const snap2 of resultPage2.data ?? []) {
      for (const snap1 of resultPage1.data ?? []) {
        TestValidator.notEquals("snapshots do not repeat across pages")(
          snap2.id,
        )(snap1.id);
      }
    }
  }
  // Pagination metadata check
  TestValidator.equals("pagination limit meta matches")(
    resultPage1.pagination?.limit,
  )(2);
  TestValidator.equals("pagination current page meta")(
    resultPage1.pagination?.current,
  )(1);
  TestValidator.equals("pagination current page meta")(
    resultPage2.pagination?.current,
  )(2);
}
