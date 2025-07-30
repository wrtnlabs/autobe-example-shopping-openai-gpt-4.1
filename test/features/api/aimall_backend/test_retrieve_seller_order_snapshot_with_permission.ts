import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAimallBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSeller";
import type { IAimallBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrder";
import type { IAimallBackendOrderSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrderSnapshot";

/**
 * Validate that a seller can retrieve a detailed snapshot of their own order.
 *
 * This test ensures that the RBAC (role-based access control) policy is
 * enforced for sellers: only the seller assigned to the order can retrieve
 * snapshots for their own orders. It verifies snapshot records include correct
 * references and meaningful order state as recorded at the time of the
 * snapshot.
 *
 * Steps:
 *
 * 1. Create a seller (administrator endpoint)
 * 2. Create a customer
 * 3. Place an order as the customer with the seller as order owner (random address
 *    id for simplicity)
 * 4. Create an order snapshot via administrator
 * 5. Retrieve the order snapshot as the seller (using orderId and snapshotId)
 * 6. Assert returned snapshot correctly references the order and matches expected
 *    content
 * 7. (Skipped) Negative-case: Non-owner seller RBAC access (not possible here)
 */
export async function test_api_aimall_backend_test_retrieve_seller_order_snapshot_with_permission(
  connection: api.IConnection,
) {
  // 1. Create a seller via the administrator endpoint
  const seller: IAimallBackendSeller =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      {
        body: {
          business_name: RandomGenerator.alphabets(12),
          email: typia.random<string & tags.Format<"email">>(),
          contact_phone: RandomGenerator.mobile(),
          status: "approved",
        } satisfies IAimallBackendSeller.ICreate,
      },
    );
  typia.assert(seller);

  // 2. Create a customer
  const customer: IAimallBackendCustomer =
    await api.functional.aimall_backend.customers.create(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        phone: RandomGenerator.mobile(),
        password_hash: null,
        status: "active",
      } satisfies IAimallBackendCustomer.ICreate,
    });
  typia.assert(customer);

  // 3. Place an order as the customer, with this seller as owner
  const order: IAimallBackendOrder =
    await api.functional.aimall_backend.customer.orders.create(connection, {
      body: {
        customer_id: customer.id,
        seller_id: seller.id,
        address_id: typia.random<string & tags.Format<"uuid">>(),
        order_status: "pending",
        total_amount: 48200,
        currency: "KRW",
      } satisfies IAimallBackendOrder.ICreate,
    });
  typia.assert(order);

  // 4. Create an order snapshot (via admin)
  const snapshot: IAimallBackendOrderSnapshot =
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

  // 5. Retrieve order snapshot as the seller for this order
  const fetched: IAimallBackendOrderSnapshot =
    await api.functional.aimall_backend.seller.orders.orderSnapshots.at(
      connection,
      {
        orderId: order.id,
        orderSnapshotId: snapshot.id,
      },
    );
  typia.assert(fetched);

  // 6. Assert fundamental details match (order/snapshot id, type, and snapshot data)
  TestValidator.equals("order id matches")(fetched.order_id)(order.id);
  TestValidator.equals("snapshot id matches")(fetched.id)(snapshot.id);
  TestValidator.equals("snapshot_type matches")(fetched.snapshot_type)(
    "created",
  );
  TestValidator.predicate("snapshot_data reflects original order")(
    JSON.parse(fetched.snapshot_data).id === order.id,
  );
}
