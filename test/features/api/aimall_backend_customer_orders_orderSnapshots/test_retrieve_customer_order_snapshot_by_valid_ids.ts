import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAimallBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSeller";
import type { IAimallBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrder";
import type { IAimallBackendOrderSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrderSnapshot";

/**
 * Validate retrieving a customer's order snapshot by valid IDs.
 *
 * This test scenario verifies that an authenticated customer can successfully
 * retrieve a specific historical audit snapshot of their own order, by using
 * valid orderId and orderSnapshotId values. It assures that all returned order
 * snapshot details, such as order status, total amount, event type, and
 * timestamps, match the event as recorded in the business audit trail.
 *
 * Steps:
 *
 * 1. Create a customer via the backend registration API.
 * 2. Create a seller via the administrator onboarding endpoint.
 * 3. Place an order for that customer, referencing the newly created seller and a
 *    sample address.
 * 4. Using admin privileges, record a snapshot of the order's current state with a
 *    specific snapshot_type and captured snapshot_data to simulate a business
 *    event.
 * 5. As the customer, call the GET endpoint to retrieve this snapshot using the
 *    orderId and orderSnapshotId.
 * 6. Assert that the returned snapshot matches the order and audit event, with
 *    correct IDs, snapshot type, and audit timestamp.
 */
export async function test_api_aimall_backend_customer_orders_orderSnapshots_test_retrieve_customer_order_snapshot_by_valid_ids(
  connection: api.IConnection,
) {
  // 1. Create a customer
  const customerEmail: string = typia.random<string & tags.Format<"email">>();
  const customerPhone: string = RandomGenerator.mobile();
  const customer = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: {
        email: customerEmail,
        phone: customerPhone,
        password_hash: null,
        status: "active",
      } satisfies IAimallBackendCustomer.ICreate,
    },
  );
  typia.assert(customer);

  // 2. Create a seller
  const sellerEmail: string = typia.random<string & tags.Format<"email">>();
  const seller =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      {
        body: {
          business_name: RandomGenerator.paragraph()(2),
          email: sellerEmail,
          contact_phone: RandomGenerator.mobile(),
          status: "approved",
        } satisfies IAimallBackendSeller.ICreate,
      },
    );
  typia.assert(seller);

  // 3. Place an order for the created customer and seller (using a random address UUID)
  const addressId: string = typia.random<string & tags.Format<"uuid">>();
  const order = await api.functional.aimall_backend.customer.orders.create(
    connection,
    {
      body: {
        customer_id: customer.id,
        seller_id: seller.id,
        address_id: addressId,
        order_status: "pending",
        total_amount: 99000,
        currency: "KRW",
      } satisfies IAimallBackendOrder.ICreate,
    },
  );
  typia.assert(order);

  // 4. Create an order snapshot for this order
  const snapshotAt = new Date().toISOString();
  const snapshotType = "created";
  const snapshotData = JSON.stringify(order);
  const snapshot =
    await api.functional.aimall_backend.administrator.orders.orderSnapshots.create(
      connection,
      {
        orderId: order.id,
        body: {
          order_id: order.id,
          snapshot_type: snapshotType,
          snapshot_data: snapshotData,
          snapshot_at: snapshotAt,
        } satisfies IAimallBackendOrderSnapshot.ICreate,
      },
    );
  typia.assert(snapshot);

  // 5. Retrieve the snapshot by orderId and orderSnapshotId (customer endpoint)
  const output =
    await api.functional.aimall_backend.customer.orders.orderSnapshots.at(
      connection,
      {
        orderId: order.id,
        orderSnapshotId: snapshot.id,
      },
    );
  typia.assert(output);

  // 6. Assert output correctness
  TestValidator.equals("order id")(output.order_id)(order.id);
  TestValidator.equals("snapshot type")(output.snapshot_type)(snapshotType);
  TestValidator.equals("snapshot data")(output.snapshot_data)(snapshotData);
  TestValidator.equals("snapshot at")(output.snapshot_at)(snapshotAt);
}
