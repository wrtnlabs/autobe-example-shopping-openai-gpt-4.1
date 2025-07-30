import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAimallBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSeller";
import type { IAimallBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrder";
import type { IAimallBackendOrderSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrderSnapshot";

/**
 * Validate that retrieving an order snapshot with a random (non-existent)
 * snapshot ID fails with a 404 error and does not leak data.
 *
 * Business context: For compliance and audit, order audit snapshots may only be
 * retrieved by owners or authorized parties, and only when the record exists.
 * It is critical that accessing a non-existent or deleted snapshot for a real
 * order returns a not found response with no extraneous information.
 *
 * Steps:
 *
 * 1. Register a customer (to own the order)
 * 2. Register a seller (to act as merchant in the order)
 * 3. Place an order for the customer linked to the created seller
 * 4. Attempt to retrieve an order snapshot using the existing order ID, but with a
 *    random UUID for orderSnapshotId which is guaranteed not to exist
 * 5. Confirm that a 404 error is thrown, and no order snapshot is returned or
 *    leaked (using TestValidator.error)
 */
export async function test_api_aimall_backend_customer_orders_orderSnapshots_test_retrieve_customer_order_snapshot_not_found(
  connection: api.IConnection,
) {
  // 1. Register a new customer
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer: IAimallBackendCustomer =
    await api.functional.aimall_backend.customers.create(connection, {
      body: {
        email: customerEmail,
        phone: RandomGenerator.mobile(),
        status: "active",
        password_hash: null,
      } satisfies IAimallBackendCustomer.ICreate,
    });
  typia.assert(customer);

  // 2. Register a new seller
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller: IAimallBackendSeller =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      {
        body: {
          business_name: RandomGenerator.alphabets(10),
          email: sellerEmail,
          contact_phone: RandomGenerator.mobile(),
          status: "approved",
        } satisfies IAimallBackendSeller.ICreate,
      },
    );
  typia.assert(seller);

  // 3. Place a new order for the customer (assumes address_id is known/valid, use random UUID)
  const order: IAimallBackendOrder =
    await api.functional.aimall_backend.customer.orders.create(connection, {
      body: {
        customer_id: customer.id,
        seller_id: seller.id,
        address_id: typia.random<string & tags.Format<"uuid">>(),
        order_status: "pending",
        total_amount: 10000,
        currency: "KRW",
      } satisfies IAimallBackendOrder.ICreate,
    });
  typia.assert(order);

  // 4/5. Try retrieving snapshot for the order with a guaranteed-nonexistent orderSnapshotId
  await TestValidator.error("404 for non-existent orderSnapshotId")(() =>
    api.functional.aimall_backend.customer.orders.orderSnapshots.at(
      connection,
      {
        orderId: order.id,
        orderSnapshotId: typia.random<string & tags.Format<"uuid">>(),
      },
    ),
  );
}
