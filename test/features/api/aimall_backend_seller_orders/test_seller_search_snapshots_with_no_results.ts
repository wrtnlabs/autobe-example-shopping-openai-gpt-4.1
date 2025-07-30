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
 * Verify correct result (empty set) when a seller searches order snapshots
 * where no entries match.
 *
 * This test ensures that when a seller queries for order snapshots of a
 * specific order using filter criteria (such as date range and snapshot types)
 * that deliberately do not match any snapshot, the endpoint responds with an
 * empty data set, and returns correct pagination metadata (total=0, page=1,
 * etc.).
 *
 * Business workflow:
 *
 * 1. Register a seller via administrator endpoint (obtain the seller record).
 * 2. Register a customer via public endpoint (obtain the customer record).
 * 3. Create a new order for the given seller/customer (generate minimal viable
 *    order data; use a unique address_id and other required fields).
 * 4. Register at least one order snapshot for the order via administrator endpoint
 *    (type 'created', snapshot_at=now, valid data), so that snapshot _does
 *    exist_, but is guaranteed _not_ to match the search below.
 * 5. As the seller, call PATCH
 *    /aimall-backend/seller/orders/{orderId}/orderSnapshots with mismatched
 *    filter parameters. Use a snapshot_type string that is not registered for
 *    this order, and a range of snapshot_at (date-time) far outside the range
 *    of the created snapshot(s).
 * 6. Validate that data array is empty ([]) and pagination.total/records are 0.
 *    Validate the pagination object structure according to business type.
 */
export async function test_api_aimall_backend_seller_orders_test_seller_search_snapshots_with_no_results(
  connection: api.IConnection,
) {
  // 1. Register seller
  const seller =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      {
        body: {
          business_name: RandomGenerator.name(),
          email: typia.random<string & tags.Format<"email">>(),
          contact_phone: RandomGenerator.mobile(),
          status: "active",
        } satisfies IAimallBackendSeller.ICreate,
      },
    );
  typia.assert(seller);

  // 2. Register customer
  const customer = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        phone: RandomGenerator.mobile(),
        password_hash: null,
        status: "active",
      } satisfies IAimallBackendCustomer.ICreate,
    },
  );
  typia.assert(customer);

  // 3. Create order (address_id is randomly generated UUID for test)
  const order = await api.functional.aimall_backend.customer.orders.create(
    connection,
    {
      body: {
        customer_id: customer.id,
        seller_id: seller.id,
        address_id: typia.random<string & tags.Format<"uuid">>(),
        order_status: "pending",
        total_amount: 10000,
        currency: "KRW",
      } satisfies IAimallBackendOrder.ICreate,
    },
  );
  typia.assert(order);

  // 4. Register a matching order snapshot (but search will *not* match this)
  const snapshot_now = new Date().toISOString();
  await api.functional.aimall_backend.administrator.orders.orderSnapshots.create(
    connection,
    {
      orderId: order.id,
      body: {
        order_id: order.id,
        snapshot_type: "created",
        snapshot_data: JSON.stringify(order),
        snapshot_at: snapshot_now,
      } satisfies IAimallBackendOrderSnapshot.ICreate,
    },
  );

  // 5. As seller, search snapshots with mismatched filters (both time range and impossible type)
  const mismatched_type = "impossible_event";
  const past = new Date(Date.now() - 1000 * 60 * 60 * 24 * 180).toISOString(); // 6 months ago
  const future = new Date(Date.now() - 1000 * 60 * 60 * 24 * 170).toISOString(); // 10 days after past (guaranteed *not* to overlap)
  const search_result =
    await api.functional.aimall_backend.seller.orders.orderSnapshots.search(
      connection,
      {
        orderId: order.id,
        body: {
          order_id: order.id,
          snapshot_type: mismatched_type,
          snapshot_at_from: past,
          snapshot_at_to: future,
          limit: 10,
          page: 1,
        } satisfies IAimallBackendOrderSnapshot.IRequest,
      },
    );
  typia.assert(search_result);

  // 6. Assert result: data is empty, and pagination indicates total=0 on page 1
  TestValidator.equals("empty data array")(
    Array.isArray(search_result.data) ? search_result.data.length : 0,
  )(0);
  TestValidator.predicate("pagination - current page is 1")(
    !!search_result.pagination && search_result.pagination.current === 1,
  );
  TestValidator.predicate("pagination - records is 0")(
    !!search_result.pagination && search_result.pagination.records === 0,
  );
  TestValidator.predicate("pagination - limit is 10")(
    !!search_result.pagination && search_result.pagination.limit === 10,
  );
}
