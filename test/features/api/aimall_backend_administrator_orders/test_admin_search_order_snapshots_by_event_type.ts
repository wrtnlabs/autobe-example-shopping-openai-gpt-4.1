import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAimallBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSeller";
import type { IAimallBackendAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAdministrator";
import type { IAimallBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrder";
import type { IAimallBackendOrderSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrderSnapshot";
import type { IPageIAimallBackendOrderSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendOrderSnapshot";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validate administrator ability to search for order snapshots by event type.
 *
 * This test covers:
 *
 * 1. Admin account registration.
 * 2. Seller account registration.
 * 3. Customer registration.
 * 4. Customer creates an order for the seller (admin context for setup).
 * 5. Create several order snapshot records for different snapshot_types (e.g.,
 *    'created', 'paid', 'fulfilled', etc.).
 * 6. As admin, search (PATCH) for order snapshot objects filtered by specific
 *    event type (e.g., 'fulfilled'), and verify:
 *
 *    - Only snapshots with given snapshot_type are returned
 *    - Snapshots are chronologically ordered by snapshot_at
 *    - Results are non-empty if at least one matching snapshot exists
 *
 * Positive and edge cases tested:
 *
 * - Filtering returns correct event type only
 * - Filtering for an event type not present returns zero results
 * - Proper ordering even if creation timestamps are manipulated
 */
export async function test_api_aimall_backend_administrator_orders_test_admin_search_order_snapshots_by_event_type(
  connection: api.IConnection,
) {
  // 1. Register administrator (use random permission_id)
  const admin: IAimallBackendAdministrator =
    await api.functional.aimall_backend.administrator.administrators.create(
      connection,
      {
        body: {
          permission_id: typia.random<string & tags.Format<"uuid">>(),
          email: typia.random<string & tags.Format<"email">>(),
          name: RandomGenerator.name(),
          status: "active",
        },
      },
    );
  typia.assert(admin);

  // 2. Register seller
  const seller: IAimallBackendSeller =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      {
        body: {
          business_name: RandomGenerator.alphaNumeric(12),
          email: typia.random<string & tags.Format<"email">>(),
          contact_phone: RandomGenerator.mobile(),
          status: "approved",
        },
      },
    );
  typia.assert(seller);

  // 3. Register customer
  const customer: IAimallBackendCustomer =
    await api.functional.aimall_backend.customers.create(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        phone: RandomGenerator.mobile(),
        password_hash: RandomGenerator.alphaNumeric(32),
        status: "active",
      },
    });
  typia.assert(customer);

  // 4. Customer places an order (requires address_id in valid UUID format)
  const order: IAimallBackendOrder =
    await api.functional.aimall_backend.customer.orders.create(connection, {
      body: {
        customer_id: customer.id,
        seller_id: seller.id,
        address_id: typia.random<string & tags.Format<"uuid">>(),
        order_number: `ORD-${new Date().toISOString().replace(/\D/g, "").slice(0, 12)}`,
        order_status: "pending",
        total_amount: 25000,
        currency: "KRW",
      },
    });
  typia.assert(order);

  // 5. Create 3 different snapshot events: 'created', 'paid', 'fulfilled' with simulated timestamps
  const eventTypes = ["created", "paid", "fulfilled"];
  const timestamps: string[] = [
    new Date(Date.now() - 3 * 60 * 1000).toISOString(), // 3 minutes ago
    new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    new Date(Date.now() - 1 * 60 * 1000).toISOString(),
  ];
  const createdSnapshots: IAimallBackendOrderSnapshot[] = [];
  for (let i = 0; i < eventTypes.length; ++i) {
    const snapshot =
      await api.functional.aimall_backend.administrator.orders.orderSnapshots.create(
        connection,
        {
          orderId: order.id,
          body: {
            order_id: order.id,
            snapshot_type: eventTypes[i],
            snapshot_data: JSON.stringify(order),
            snapshot_at: timestamps[i],
          },
        },
      );
    typia.assert(snapshot);
    createdSnapshots.push(snapshot);
  }

  // 6. FILTER: Search for 'fulfilled' event-type snapshots for the order
  const searchType = "fulfilled";
  const searchResult =
    await api.functional.aimall_backend.administrator.orders.orderSnapshots.search(
      connection,
      {
        orderId: order.id,
        body: {
          order_id: order.id,
          snapshot_type: searchType,
        },
      },
    );
  typia.assert(searchResult);
  TestValidator.predicate("should return at least 1 fulfilled snapshot")(
    !!searchResult.data && searchResult.data.length === 1,
  );
  if (searchResult.data) {
    for (const snap of searchResult.data) {
      TestValidator.equals("must have snapshot_type fulfilled")(
        snap.snapshot_type,
      )(searchType);
    }
    // Chronological order check
    const expectedTimestamps = createdSnapshots
      .filter((x) => x.snapshot_type === searchType)
      .map((x) => x.snapshot_at);
    for (let i = 1; i < searchResult.data.length; ++i) {
      TestValidator.predicate("results in chronological order")(
        searchResult.data[i - 1].snapshot_at <=
          searchResult.data[i].snapshot_at,
      );
    }
    TestValidator.equals("timestamps match")(
      searchResult.data.map((x) => x.snapshot_at),
    )(expectedTimestamps);
  }

  // 7. FILTER: Search for a non-existent event type, e.g., 'cancelled'
  const noneSearch =
    await api.functional.aimall_backend.administrator.orders.orderSnapshots.search(
      connection,
      {
        orderId: order.id,
        body: {
          order_id: order.id,
          snapshot_type: "cancelled",
        },
      },
    );
  typia.assert(noneSearch);
  TestValidator.predicate("no snapshots should exist for 'cancelled'")(
    !noneSearch.data || noneSearch.data.length === 0,
  );
}
