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
 * Validate paginated administrative PATCH search for order snapshots.
 *
 * This test ensures that administrators can retrieve paginated results for a
 * high volume of order snapshot records. It verifies that:
 *
 * - The endpoint paginates correctly with more than one page of snapshot records.
 * - The returned page size matches the 'limit' parameter.
 * - The returned page number matches the 'page' parameter.
 * - The total records count and page count are consistent.
 *
 * Step-by-step process:
 *
 * 1. Create an administrator account (providing a permission ID).
 * 2. Create a seller account.
 * 3. Create a customer account.
 * 4. Customer creates an order (providing customer, seller, and address IDs as
 *    required).
 * 5. As admin, create 23 snapshot records for the order (with different
 *    snapshot_types and timestamps, all referencing the same order).
 * 6. As admin, call PATCH search with limit=10 and page=1; confirm 10 records,
 *    correct page/limit, correct total records/pages.
 * 7. Call PATCH search again with limit=10 and page=2; confirm 10 records, page=2.
 * 8. Call PATCH search with limit=10 and page=3; confirm 3 records for last page.
 * 9. Optionally, test edge case (empty result if page>totalPages).
 */
export async function test_api_aimall_backend_administrator_orders_orderSnapshots_test_admin_search_order_snapshots_pagination(
  connection: api.IConnection,
) {
  // 1. Create administrator
  const permissionId: string = typia.random<string & tags.Format<"uuid">>();
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: IAimallBackendAdministrator =
    await api.functional.aimall_backend.administrator.administrators.create(
      connection,
      {
        body: {
          permission_id: permissionId,
          email: adminEmail,
          name: RandomGenerator.name(),
          status: "active",
        } satisfies IAimallBackendAdministrator.ICreate,
      },
    );
  typia.assert(admin);

  // 2. Create seller
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller: IAimallBackendSeller =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      {
        body: {
          business_name: RandomGenerator.name(),
          email: sellerEmail,
          contact_phone: RandomGenerator.mobile(),
          status: "approved",
        } satisfies IAimallBackendSeller.ICreate,
      },
    );
  typia.assert(seller);

  // 3. Create customer
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer: IAimallBackendCustomer =
    await api.functional.aimall_backend.customers.create(connection, {
      body: {
        email: customerEmail,
        phone: RandomGenerator.mobile(),
        password_hash: null,
        status: "active",
      } satisfies IAimallBackendCustomer.ICreate,
    });
  typia.assert(customer);

  // 4. Customer creates order (requires fake address id)
  const addressId: string = typia.random<string & tags.Format<"uuid">>();
  const order: IAimallBackendOrder =
    await api.functional.aimall_backend.customer.orders.create(connection, {
      body: {
        customer_id: customer.id,
        seller_id: seller.id,
        address_id: addressId,
        order_status: "pending",
        total_amount: typia.random<number>(),
        currency: "KRW",
      } satisfies IAimallBackendOrder.ICreate,
    });
  typia.assert(order);

  // 5. Admin creates 23 snapshot records for the order
  const snapshotTypes = [
    "created",
    "modified",
    "fulfilled",
    "cancelled",
    "reviewed",
    "audited",
  ];
  const now = new Date();
  const snapshotIds: string[] = [];
  for (let i = 0; i < 23; ++i) {
    const snapType = snapshotTypes[i % snapshotTypes.length];
    const stamp = new Date(now.getTime() + i * 60000).toISOString();
    const snap: IAimallBackendOrderSnapshot =
      await api.functional.aimall_backend.administrator.orders.orderSnapshots.create(
        connection,
        {
          orderId: order.id,
          body: {
            order_id: order.id,
            snapshot_type: snapType,
            snapshot_data: JSON.stringify({ order_status: snapType, idx: i }),
            snapshot_at: stamp,
          } satisfies IAimallBackendOrderSnapshot.ICreate,
        },
      );
    typia.assert(snap);
    snapshotIds.push(snap.id);
  }

  // Helper for paging validation
  async function assert_page(
    page: number,
    limit: number,
    expectedCount: number,
    expectedPages: number,
    expectedRecords: number,
  ): Promise<void> {
    const pageRes =
      await api.functional.aimall_backend.administrator.orders.orderSnapshots.search(
        connection,
        {
          orderId: order.id,
          body: {
            order_id: order.id,
            limit,
            page,
          } satisfies IAimallBackendOrderSnapshot.IRequest,
        },
      );
    typia.assert(pageRes);
    TestValidator.equals("pagination.present")(
      typeof pageRes.pagination !== "undefined",
    )(true);
    if (pageRes.pagination) {
      TestValidator.equals("current page")(pageRes.pagination.current)(page);
      TestValidator.equals("limit")(pageRes.pagination.limit)(limit);
      TestValidator.equals("records")(pageRes.pagination.records)(
        expectedRecords,
      );
      TestValidator.equals("pages")(pageRes.pagination.pages)(expectedPages);
    }
    TestValidator.equals("data count")(
      Array.isArray(pageRes.data) ? pageRes.data.length : 0,
    )(expectedCount);
  }

  // 6. search page 1 (10 results)
  await assert_page(1, 10, 10, 3, 23);
  // 7. search page 2 (10 results)
  await assert_page(2, 10, 10, 3, 23);
  // 8. search page 3 (3 results)
  await assert_page(3, 10, 3, 3, 23);
  // 9. page 4 (should be empty data, page meta = 4/3?)
  const pageRes4 =
    await api.functional.aimall_backend.administrator.orders.orderSnapshots.search(
      connection,
      {
        orderId: order.id,
        body: {
          order_id: order.id,
          limit: 10,
          page: 4,
        } satisfies IAimallBackendOrderSnapshot.IRequest,
      },
    );
  typia.assert(pageRes4);
  TestValidator.equals("pagination.present")(
    typeof pageRes4.pagination !== "undefined",
  )(true);
  if (pageRes4.pagination) {
    TestValidator.equals("current page")(pageRes4.pagination.current)(4);
    TestValidator.equals("limit")(pageRes4.pagination.limit)(10);
    TestValidator.equals("records")(pageRes4.pagination.records)(23);
    TestValidator.equals("pages")(pageRes4.pagination.pages)(3);
  }
  TestValidator.equals("data count")(
    Array.isArray(pageRes4.data) ? pageRes4.data.length : 0,
  )(0);
}
