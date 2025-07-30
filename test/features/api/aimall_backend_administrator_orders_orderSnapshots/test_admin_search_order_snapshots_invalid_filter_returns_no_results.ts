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
 * Validate that the order snapshot search endpoint returns empty results and
 * correct pagination metadata when given a filter that matches no order
 * snapshots.
 *
 * Scenario:
 *
 * 1. Register a new administrator account to access admin endpoints.
 * 2. Register a new seller account (required for order creation).
 * 3. Register a new customer account (required for order creation).
 * 4. Create a new order as the customer, associating the customer and seller.
 * 5. Ensure at least one order snapshot exists for the order by explicitly
 *    creating it as an admin.
 * 6. Perform an order snapshot search on this order with a deliberately mismatched
 *    filter (unknown event type + future timestamp) that matches no records.
 * 7. Validate the search response: empty data array (or missing data field) and
 *    pagination info with records=0.
 */
export async function test_api_aimall_backend_administrator_orders_orderSnapshots_test_admin_search_order_snapshots_invalid_filter_returns_no_results(
  connection: api.IConnection,
) {
  // 1. Register a new administrator
  const adminPermissionId = typia.random<string & tags.Format<"uuid">>();
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin =
    await api.functional.aimall_backend.administrator.administrators.create(
      connection,
      {
        body: {
          permission_id: adminPermissionId,
          email: adminEmail,
          name: RandomGenerator.name(),
          status: "active",
        },
      },
    );
  typia.assert(admin);

  // 2. Register a seller
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      {
        body: {
          business_name: RandomGenerator.paragraph()(),
          email: sellerEmail,
          contact_phone: RandomGenerator.mobile(),
          status: "approved",
        },
      },
    );
  typia.assert(seller);

  // 3. Register a customer
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: {
        email: customerEmail,
        phone: RandomGenerator.mobile(),
        status: "active",
      },
    },
  );
  typia.assert(customer);

  // 4. Create an order for the customer and seller
  const addressId = typia.random<string & tags.Format<"uuid">>();
  const order = await api.functional.aimall_backend.customer.orders.create(
    connection,
    {
      body: {
        customer_id: customer.id,
        seller_id: seller.id,
        address_id: addressId,
        order_status: "pending",
        total_amount: 10000,
        currency: "KRW",
      },
    },
  );
  typia.assert(order);

  // 5. Create at least one snapshot
  const knownSnapshotType = "created";
  const snapshot =
    await api.functional.aimall_backend.administrator.orders.orderSnapshots.create(
      connection,
      {
        orderId: order.id,
        body: {
          order_id: order.id,
          snapshot_type: knownSnapshotType,
          snapshot_data: JSON.stringify(order),
          snapshot_at: new Date().toISOString(),
        },
      },
    );
  typia.assert(snapshot);

  // 6. Search with a filter that cannot match any snapshots for this order
  const mismatchedType = "__nonexistent_snapshot_type__";
  const outOfBoundsFrom = "2100-01-01T00:00:00.000Z";
  const pageLimit = 50;
  const searchResult =
    await api.functional.aimall_backend.administrator.orders.orderSnapshots.search(
      connection,
      {
        orderId: order.id,
        body: {
          snapshot_type: mismatchedType,
          snapshot_at_from: outOfBoundsFrom,
          limit: pageLimit,
          page: 1,
        },
      },
    );
  typia.assert(searchResult);

  // 7. Validation: data must be empty and pagination must show records=0
  TestValidator.equals("search returned empty data array")(
    searchResult.data ?? [],
  )([]);
  TestValidator.predicate("pagination records == 0")(
    !!searchResult.pagination && searchResult.pagination.records === 0,
  );
}
