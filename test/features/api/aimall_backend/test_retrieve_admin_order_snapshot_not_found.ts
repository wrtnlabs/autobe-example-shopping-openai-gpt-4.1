import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAimallBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSeller";
import type { IAimallBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrder";
import type { IAimallBackendOrderSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrderSnapshot";

/**
 * Validate 'not found' error when retrieving a non-existent order snapshot as
 * administrator.
 *
 * Business Context: This test verifies that, even when an order exists,
 * attempting to fetch an order snapshot with a non-existent ID results in an
 * error. This guards against info leaks and invalid data access by ensuring
 * robustness in the snapshot retrieval logic for administrators.
 *
 * Test Steps:
 *
 * 1. Create a customer to be linked to the order (via admin endpoint).
 * 2. Register a seller to fulfill the order.
 * 3. Generate an order using the created customer and seller, with a random UUID
 *    as the address_id (as no address entity/API exists in the DTO set).
 * 4. Attempt to retrieve an order snapshot from the administrator endpoint using
 *    the real orderId and a random, non-existent orderSnapshotId.
 * 5. Assert that the API responds with an error (do not inspect the error
 *    message/type, only that an error is thrown as required by business
 *    rules).
 */
export async function test_api_aimall_backend_test_retrieve_admin_order_snapshot_not_found(
  connection: api.IConnection,
) {
  // 1. Create customer entity as prerequisite for order
  const customer = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        phone: typia.random<string>(),
        password_hash: null,
        status: "active",
      } satisfies IAimallBackendCustomer.ICreate,
    },
  );
  typia.assert(customer);

  // 2. Register a seller entity
  const seller =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      {
        body: {
          business_name: "Business " + typia.random<string>(),
          email: typia.random<string & tags.Format<"email">>(),
          contact_phone: typia.random<string>(),
          status: "approved",
        } satisfies IAimallBackendSeller.ICreate,
      },
    );
  typia.assert(seller);

  // 3. Create an order using these entities
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

  // 4. Attempt to retrieve a non-existent snapshot for this order
  const fakeSnapshotId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("should throw when snapshot does not exist")(
    async () => {
      await api.functional.aimall_backend.administrator.orders.orderSnapshots.at(
        connection,
        {
          orderId: order.id,
          orderSnapshotId: fakeSnapshotId,
        },
      );
    },
  );
}
