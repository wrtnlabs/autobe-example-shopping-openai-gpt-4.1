import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAimallBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSeller";
import type { IAimallBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrder";
import type { IAimallBackendOrderSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrderSnapshot";

/**
 * E2E test verifying that an administrator can retrieve a specific order
 * snapshot for any order by orderId and orderSnapshotId.
 *
 * Business context: In audit and compliance scenarios, administrators need to
 * review historical snapshots of order state, sometimes for dispute resolution
 * or legal reasons. This test ensures that all necessary steps (customer
 * creation, seller registration, order placement, snapshot creation) are
 * executed, and the administrator can access and validate the returned snapshot
 * data.
 *
 * Steps:
 *
 * 1. Create a customer (to act as the purchaser)
 * 2. Create a seller (to act as the merchant)
 * 3. Create an order with the customer and seller
 * 4. As admin, create an order snapshot for the order, specifying relevant
 *    snapshot type and data
 * 5. Retrieve the specific order snapshot by orderId and orderSnapshotId
 * 6. Validate that the retrieved snapshot matches what was supplied, especially in
 *    core metadata fields (type, data, snapshot_at, etc.)
 */
export async function test_api_aimall_backend_administrator_orders_orderSnapshots_test_retrieve_admin_order_snapshot_success(
  connection: api.IConnection,
) {
  // 1. Create a customer for the order
  const customer = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        phone: RandomGenerator.mobile(),
        password_hash: RandomGenerator.alphaNumeric(32),
        status: "active",
      } satisfies IAimallBackendCustomer.ICreate,
    },
  );
  typia.assert(customer);

  // 2. Register seller for the order
  const seller =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      {
        body: {
          business_name: RandomGenerator.alphabets(10),
          email: typia.random<string & tags.Format<"email">>(),
          contact_phone: RandomGenerator.mobile(),
          status: "approved",
        } satisfies IAimallBackendSeller.ICreate,
      },
    );
  typia.assert(seller);

  // 3. Create an order for the customer
  const address_id = typia.random<string & tags.Format<"uuid">>();
  const order = await api.functional.aimall_backend.customer.orders.create(
    connection,
    {
      body: {
        customer_id: customer.id,
        seller_id: seller.id,
        address_id,
        order_number: `ORD-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-0001`,
        order_status: "pending",
        total_amount: 19999,
        currency: "KRW",
      } satisfies IAimallBackendOrder.ICreate,
    },
  );
  typia.assert(order);

  // 4. Admin creates audit snapshot for the order
  const now = new Date().toISOString();
  const snapshotBody = {
    order_id: order.id,
    snapshot_type: "created",
    snapshot_data: JSON.stringify(order), // Save the complete order as snapshot
    snapshot_at: now,
  } satisfies IAimallBackendOrderSnapshot.ICreate;
  const snapshot =
    await api.functional.aimall_backend.administrator.orders.orderSnapshots.create(
      connection,
      {
        orderId: order.id,
        body: snapshotBody,
      },
    );
  typia.assert(snapshot);

  // 5. Retrieve the snapshot by its IDs
  const retrieved =
    await api.functional.aimall_backend.administrator.orders.orderSnapshots.at(
      connection,
      {
        orderId: order.id,
        orderSnapshotId: snapshot.id,
      },
    );
  typia.assert(retrieved);

  // 6. Validate key metadata matches
  TestValidator.equals("order ID matches")(retrieved.order_id)(order.id);
  TestValidator.equals("snapshot type matches")(retrieved.snapshot_type)(
    snapshotBody.snapshot_type,
  );
  TestValidator.equals("snapshot_at matches")(retrieved.snapshot_at)(
    snapshotBody.snapshot_at,
  );
  TestValidator.equals("snapshot data matches")(retrieved.snapshot_data)(
    snapshotBody.snapshot_data,
  );
}
