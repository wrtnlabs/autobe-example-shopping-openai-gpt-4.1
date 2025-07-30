import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAimallBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSeller";
import type { IAimallBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrder";
import type { IAimallBackendOrderSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrderSnapshot";

/**
 * Validate access control for seller order snapshot retrieval.
 *
 * This test verifies that a seller cannot access snapshots for orders they do
 * not own, enforcing access scoping logic.
 *
 * Step-by-step process:
 *
 * 1. Create a legitimate seller (Seller A) who will attempt the forbidden access.
 * 2. Create another seller (Seller B), who will own the actual order.
 * 3. Create a customer.
 * 4. Create an order through the customer, associating it with Seller B.
 * 5. As admin, create a snapshot for the above order.
 * 6. Simulate Seller A attempting to retrieve the snapshot for Seller B's order
 *    (should fail with forbidden/error).
 * 7. Validate that access is denied with an appropriate error.
 */
export async function test_api_aimall_backend_test_retrieve_seller_order_snapshot_without_permission(
  connection: api.IConnection,
) {
  // 1. Create Seller A (legitimate seller)
  const sellerA =
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
  typia.assert(sellerA);

  // 2. Create Seller B (order owner)
  const sellerB =
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
  typia.assert(sellerB);

  // 3. Create a customer
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

  // 4. Create an order as the customer with Seller B
  const order = await api.functional.aimall_backend.customer.orders.create(
    connection,
    {
      body: {
        customer_id: customer.id,
        seller_id: sellerB.id,
        address_id: typia.random<string & tags.Format<"uuid">>(),
        order_number: `ORD-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${typia.random<number & tags.Type<"uint32">>()}`,
        order_status: "pending",
        total_amount: typia.random<number & tags.Type<"uint32">>(),
        currency: "KRW",
      } satisfies IAimallBackendOrder.ICreate,
    },
  );
  typia.assert(order);

  // 5. As admin, create a snapshot for this order
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

  // 6. Simulate Seller A attempting to access the snapshot for Seller B's order
  await TestValidator.error(
    "Seller should not be able to access another seller's order snapshot",
  )(async () => {
    await api.functional.aimall_backend.seller.orders.orderSnapshots.at(
      connection,
      {
        orderId: order.id,
        orderSnapshotId: snapshot.id,
      },
    );
  });
}
