import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAimallBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSeller";
import type { IAimallBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrder";
import type { IAimallBackendOrderSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrderSnapshot";

/**
 * Validate the system's protection against data exposure by ensuring that
 * retrieving an order snapshot (by a seller) with a non-existent snapshotId for
 * a real order responds with a not found error.
 *
 * Business rationale:
 *
 * - Even valid sellers should not receive details for non-existent audit events.
 * - This protects historical audit state from brute-force discovery/exposure.
 *
 * Test Flow:
 *
 * 1. Create a seller for the operation context (simulate backend admin
 *    onboarding).
 * 2. Create a customer who will place an order with the seller.
 * 3. Place an order as the customer for this seller (mock address required, use
 *    random UUID).
 * 4. Attempt to retrieve an order snapshot for this order, but supply a random
 *    UUID that does not exist in the system as the snapshotId.
 * 5. Assert that a 'not found' error (typically 404) is thrown and nothing is
 *    exposed.
 *
 * Error assertion: only error occurrence is checked; error type/message is not
 * validated in detail (per E2E standards).
 */
export async function test_api_aimall_backend_test_retrieve_seller_order_snapshot_nonexistent(
  connection: api.IConnection,
) {
  // 1. Create seller (as admin backend actor)
  const seller =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      {
        body: {
          business_name: RandomGenerator.name(),
          email: typia.random<string & tags.Format<"email">>(),
          contact_phone: RandomGenerator.mobile(),
          status: "approved", // use a valid operational status
        } satisfies IAimallBackendSeller.ICreate,
      },
    );
  typia.assert(seller);

  // 2. Create customer
  const customer = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        phone: RandomGenerator.mobile(),
        password_hash: null, // simulate external registration
        status: "active",
      } satisfies IAimallBackendCustomer.ICreate,
    },
  );
  typia.assert(customer);

  // 3. Place a single order (mock address ID, random valid UUID)
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

  // 4. Attempt order snapshot retrieval with non-existent (random) snapshotId
  const fakeSnapshotId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("should throw 404 for non-existent order snapshot")(
    async () => {
      await api.functional.aimall_backend.seller.orders.orderSnapshots.at(
        connection,
        {
          orderId: order.id,
          orderSnapshotId: fakeSnapshotId,
        },
      );
    },
  );
}
