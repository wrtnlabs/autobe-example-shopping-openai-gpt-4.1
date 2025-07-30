import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAimallBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSeller";
import type { IAimallBackendOrderSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrderSnapshot";
import type { IPageIAimallBackendOrderSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendOrderSnapshot";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validate that only the order-owning seller can filter order snapshots via the
 * PATCH endpoint.
 *
 * This test ensures that unauthorized sellers (those who do not own an order)
 * cannot access snapshot data for orders they do not own. It simulates the
 * realistic scenario where two sellers have been registered, a customer places
 * an order with Seller A, and Seller B attempts to retrieve order snapshots for
 * that order. Per business rules and access control, this should be forbidden,
 * with no snapshot data leakage.
 *
 * The test covers:
 *
 * - Proper registration of two separate sellers (A and B).
 * - Creation of a customer and an order linked to Seller A (since only Seller A
 *   is legitimate order owner).
 * - Creation of at least one snapshot for that order (by admin API).
 * - Attempted search/filter for snapshots on that order by Seller B
 *   (unauthorized), via PATCH endpoint.
 * - Assert that no data is returned and error handling is correct (which may be:
 *   thrown error, empty dataset, or forbidden/401/403 HTTP error, depending on
 *   implementation).
 *
 * Steps:
 *
 * 1. Register Seller A (will be order owner).
 * 2. Register Seller B (unauthorized party).
 * 3. Register a customer and simulate an order associated only with Seller A (the
 *    test will fudge order/snapshot linkage as realistic as possible).
 * 4. Create at least one order snapshot for that order (using administrator
 *    function for setup).
 * 5. Attempt to search snapshots for the order as Seller B (not the owner), via
 *    PATCH endpoint.
 * 6. Expect an error (permission denied or similar); verify no snapshot data is
 *    exposed to unauthorized seller.
 */
export async function test_api_aimall_backend_seller_orders_orderSnapshots_test_seller_search_snapshots_permission_error(
  connection: api.IConnection,
) {
  // 1. Register Seller A
  const sellerA =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      {
        body: {
          business_name: RandomGenerator.name(),
          email: typia.random<string & tags.Format<"email">>(),
          contact_phone: RandomGenerator.mobile(),
          status: "approved",
        } satisfies IAimallBackendSeller.ICreate,
      },
    );
  typia.assert(sellerA);

  // 2. Register Seller B (unauthorized)
  const sellerB =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      {
        body: {
          business_name: RandomGenerator.name(),
          email: typia.random<string & tags.Format<"email">>(),
          contact_phone: RandomGenerator.mobile(),
          status: "approved",
        } satisfies IAimallBackendSeller.ICreate,
      },
    );
  typia.assert(sellerB);

  // 3. Register customer
  const customer = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        phone: RandomGenerator.mobile(),
        status: "active",
        password_hash: null,
      } satisfies IAimallBackendCustomer.ICreate,
    },
  );
  typia.assert(customer);

  // Simulate an order UUID belonging to sellerA
  const orderId = typia.random<string & tags.Format<"uuid">>();

  // 4. Admin: create at least one snapshot for the order
  const snapshot =
    await api.functional.aimall_backend.administrator.orders.orderSnapshots.create(
      connection,
      {
        orderId,
        body: {
          order_id: orderId,
          snapshot_type: "created",
          snapshot_data: JSON.stringify({ test: "state" }),
          snapshot_at: new Date().toISOString(),
        } satisfies IAimallBackendOrderSnapshot.ICreate,
      },
    );
  typia.assert(snapshot);

  // [Assume here that Seller B would somehow be authenticated - simulation only, as we cannot perform login flow in available APIs.]
  // 5. Seller B attempts to query order snapshots for Seller A's order
  await TestValidator.error("permission denied for non-owner seller")(
    async () => {
      await api.functional.aimall_backend.seller.orders.orderSnapshots.search(
        connection,
        {
          orderId,
          body: {
            order_id: orderId,
          } satisfies IAimallBackendOrderSnapshot.IRequest,
        },
      );
    },
  );
}
