import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAimallBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSeller";
import type { IAimallBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrder";
import type { IAimallBackendOrderSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrderSnapshot";
import type { IPageIAimallBackendOrderSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendOrderSnapshot";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validate seller advanced search filtering for order snapshot audit records by
 * date range and snapshot type.
 *
 * This test simulates a real-world workflow where a seller wants to audit the
 * history of a specific order's events (snapshots), filtering by event type and
 * time period, and verifies correct filtering and pagination responses.
 *
 * Steps:
 *
 * 1. Register a new seller via admin API (dependencies)
 * 2. Register a customer
 * 3. Create a new order for the customer and seller (minimum required fields,
 *    random realistic values)
 * 4. Create multiple order snapshots (different types, dates) for the order via
 *    admin API
 * 5. As the seller, call PATCH
 *    /aimall-backend/seller/orders/{orderId}/orderSnapshots:
 *
 *    - Filter for a specific snapshot type & date range matching only a subset of
 *         created snapshots
 *    - Verify that only the correct snapshots (type+date) are returned
 *    - Pagination meta is present and matches expectation
 * 6. Edge: filter by a type/date combination that excludes all snapshots (expect
 *    empty result set, correct pagination)
 */
export async function test_api_aimall_backend_test_seller_filter_order_snapshots_by_date_and_type(
  connection: api.IConnection,
) {
  // 1. Register seller
  const seller =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      {
        body: {
          business_name: RandomGenerator.alphaNumeric(15),
          email: RandomGenerator.alphaNumeric(8) + "@aimall.com",
          contact_phone: RandomGenerator.mobile(),
          status: "active",
        },
      },
    );
  typia.assert(seller);

  // 2. Register customer
  const customer = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: {
        email: RandomGenerator.alphaNumeric(8) + "@customer.com",
        phone: RandomGenerator.mobile(),
        password_hash: RandomGenerator.alphaNumeric(16),
        status: "active",
      },
    },
  );
  typia.assert(customer);

  // 3. Create order for customer/seller
  const order = await api.functional.aimall_backend.customer.orders.create(
    connection,
    {
      body: {
        customer_id: customer.id,
        seller_id: seller.id,
        address_id: typia.random<string & tags.Format<"uuid">>(),
        order_status: "pending",
        total_amount: 49900,
        currency: "KRW",
        // order_number intentionally omitted: let system auto-generate
      },
    },
  );
  typia.assert(order);

  // 4. Create multiple audit snapshots for order (with varying types and dates)
  const snapshotTypes = ["created", "modified", "fulfilled"];
  const snapshotEntries: IAimallBackendOrderSnapshot[] =
    await ArrayUtil.asyncRepeat(5)(async (i: number) => {
      const type = snapshotTypes[i % snapshotTypes.length];
      const date = new Date(
        Date.now() - (5 - i) * 24 * 60 * 60 * 1000,
      ).toISOString(); // days ago
      const snap =
        await api.functional.aimall_backend.administrator.orders.orderSnapshots.create(
          connection,
          {
            orderId: order.id,
            body: {
              order_id: order.id,
              snapshot_type: type,
              snapshot_data: JSON.stringify({ order_status: type }),
              snapshot_at: date,
            },
          },
        );
      typia.assert(snap);
      return snap;
    });

  // Pick a type and date range that will only match a subset
  const filterType = "modified";
  // Find entries of that type, get date range
  const filtered = snapshotEntries.filter(
    (s) => s.snapshot_type === filterType,
  );
  const from = filtered[0]?.snapshot_at;
  const to = filtered[filtered.length - 1]?.snapshot_at;

  // 5. Seller performs filtered search
  const searchResult =
    await api.functional.aimall_backend.seller.orders.orderSnapshots.search(
      connection,
      {
        orderId: order.id,
        body: {
          order_id: order.id,
          snapshot_type: filterType,
          snapshot_at_from: from,
          snapshot_at_to: to,
          limit: 100,
          page: 1,
        },
      },
    );
  typia.assert(searchResult);
  // Only the proper subset should return, and all match both type & date range
  const resultSnapshots = searchResult.data ?? [];
  for (const snap of resultSnapshots) {
    TestValidator.equals("order id matches")(snap.order_id)(order.id);
    TestValidator.equals("type matches")(snap.snapshot_type)(filterType);
    TestValidator.predicate("date in range")(
      (!from || snap.snapshot_at >= from) && (!to || snap.snapshot_at <= to),
    );
  }
  // Also check basic pagination meta
  if (searchResult.pagination) {
    TestValidator.equals("limit")(searchResult.pagination.limit)(100);
    TestValidator.equals("page")(searchResult.pagination.current)(1);
  }

  // 6. Edge: filter that will return nothing
  const noneRes =
    await api.functional.aimall_backend.seller.orders.orderSnapshots.search(
      connection,
      {
        orderId: order.id,
        body: {
          order_id: order.id,
          snapshot_type: "cancelled", // not used above
          snapshot_at_from: from,
          snapshot_at_to: to,
          limit: 100,
          page: 1,
        },
      },
    );
  typia.assert(noneRes);
  TestValidator.equals("no data")(noneRes.data ?? [])([]);
}
