import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrder";

/**
 * Validate that a seller cannot access the order details of another seller.
 *
 * This test ensures robust access control enforcement: a seller authenticated
 * in the system attempts to fetch order details belonging to a different seller
 * by using an orderId that is not associated with their account. Proper
 * implementation should deny access and return an error (preferably 403
 * Forbidden). This test does not require data creation, but must assume two
 * distinct sellers and a legitimate order belonging to someone else.
 *
 * Steps implemented:
 *
 * 1. Authenticate as SellerA (simulated)
 * 2. Attempt to retrieve order details for an order known to belong to SellerB
 * 3. Validate that the response is a 403 Forbidden or other appropriate error
 *    (e.g., 404 Not Found if the system does not disclose unauthorized
 *    records)
 * 4. Confirm that access to other sellers' resources is denied and no sensitive
 *    order data is leaked
 */
export async function test_api_aimall_backend_seller_orders_test_get_order_details_by_invalid_seller(
  connection: api.IConnection,
) {
  // Step 1: Simulate context of SellerA already authenticated (connection carries SellerA's credentials)

  // Step 2: Use a valid orderId belonging to a different seller (SellerB)
  const otherSellerOrderId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // Step 3: Attempt to retrieve the order details
  await TestValidator.error("should not allow access to other seller's order")(
    async () => {
      await api.functional.aimall_backend.seller.orders.at(connection, {
        orderId: otherSellerOrderId,
      });
    },
  );
}
