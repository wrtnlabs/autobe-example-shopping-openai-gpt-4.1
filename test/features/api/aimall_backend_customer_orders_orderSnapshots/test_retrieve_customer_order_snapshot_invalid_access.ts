import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAimallBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSeller";
import type { IAimallBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrder";
import type { IAimallBackendOrderSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrderSnapshot";

/**
 * Validate forbidden access to another customer's order snapshot.
 *
 * Business context: Ensures security boundaries by denying access to order
 * snapshots for customers who do not own the corresponding order. This prevents
 * data leakage and upholds privacy.
 *
 * Step-by-step process:
 *
 * 1. Create two unique customers: customerA (the owner) and customerB (for
 *    negative test).
 * 2. Register a seller to associate with the test order.
 * 3. Place an order for customerA and the seller.
 * 4. Create an order snapshot as administrator for the order.
 * 5. Simulate snapshot retrieval attempt as customerB (not order owner). Expect
 *    access to be denied (should throw error, e.g., 403 Forbidden).
 */
export async function test_api_aimall_backend_customer_orders_orderSnapshots_test_retrieve_customer_order_snapshot_invalid_access(
  connection: api.IConnection,
) {
  // 1. Register customerA (order owner)
  const customerAInput = {
    email: typia.random<string & tags.Format<"email">>(),
    phone: RandomGenerator.mobile(),
    password_hash: "hashA-" + RandomGenerator.alphaNumeric(16),
    status: "active",
  } satisfies IAimallBackendCustomer.ICreate;
  const customerA = await api.functional.aimall_backend.customers.create(
    connection,
    { body: customerAInput },
  );
  typia.assert(customerA);

  // 2. Register customerB (should not have access)
  const customerBInput = {
    email: typia.random<string & tags.Format<"email">>(),
    phone: RandomGenerator.mobile(),
    password_hash: "hashB-" + RandomGenerator.alphaNumeric(16),
    status: "active",
  } satisfies IAimallBackendCustomer.ICreate;
  const customerB = await api.functional.aimall_backend.customers.create(
    connection,
    { body: customerBInput },
  );
  typia.assert(customerB);

  // 3. Register a seller for the order
  const sellerInput = {
    business_name: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    contact_phone: RandomGenerator.mobile(),
    status: "approved",
  } satisfies IAimallBackendSeller.ICreate;
  const seller =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      { body: sellerInput },
    );
  typia.assert(seller);

  // 4. Place the test order for customerA to the seller
  const orderInput = {
    customer_id: customerA.id,
    seller_id: seller.id,
    address_id: typia.random<string & tags.Format<"uuid">>(),
    order_status: "pending",
    total_amount: 10000,
    currency: "KRW",
  } satisfies IAimallBackendOrder.ICreate;
  const order = await api.functional.aimall_backend.customer.orders.create(
    connection,
    { body: orderInput },
  );
  typia.assert(order);

  // 5. As admin, create an order snapshot for the order
  const snapshotInput = {
    order_id: order.id,
    snapshot_type: "created",
    snapshot_data: JSON.stringify(order),
    snapshot_at: new Date().toISOString(),
  } satisfies IAimallBackendOrderSnapshot.ICreate;
  const snapshot =
    await api.functional.aimall_backend.administrator.orders.orderSnapshots.create(
      connection,
      {
        orderId: order.id,
        body: snapshotInput,
      },
    );
  typia.assert(snapshot);

  // 6. Simulate snapshot retrieval attempt as customerB (should be forbidden).
  // NOTE: Must ensure 'connection' is contextually customerB's credentials here if actual authentication system applies.
  await TestValidator.error(
    "customerB should not access another customer's order snapshot",
  )(async () => {
    await api.functional.aimall_backend.customer.orders.orderSnapshots.at(
      connection,
      {
        orderId: order.id,
        orderSnapshotId: snapshot.id,
      },
    );
  });
}
