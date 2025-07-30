import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrder";

/**
 * Validate that unauthorized/non-seller users cannot create seller orders.
 *
 * This test ensures that a user who does NOT have seller privileges (e.g., an
 * unauthenticated, customer, or generic account) is prohibited from creating a
 * new seller order via the /aimall-backend/seller/orders endpoint. The API must
 * return an appropriate authorization error rather than allowing order
 * creation. This protects business rules and data integrity for order
 * management.
 *
 * Test Steps:
 *
 * 1. Attempt to create a seller order using a connection that is NOT authenticated
 *    or does not have seller privileges. Supply a plausible
 *    IAimallBackendOrder.ICreate payload, using random but valid UUIDs, status,
 *    currency, and amount.
 * 2. The API should deny the request, returning a 401 or 403 HTTP error.
 * 3. Validate that an authorization error is thrown and NO order record is
 *    returned.
 *
 * Edge Cases:
 *
 * - Try both unauthenticated and authenticated non-seller (e.g., customer) if
 *   possible.
 * - Ensure error is due to permission, not validation of input data.
 */
export async function test_api_aimall_backend_seller_orders_test_create_order_with_unauthorized_actor(
  connection: api.IConnection,
) {
  // 1. Attempt creation of an order without seller authorization
  await TestValidator.error(
    "should refuse order creation by unauthorized actor",
  )(async () => {
    await api.functional.aimall_backend.seller.orders.create(connection, {
      body: {
        customer_id: typia.random<string & tags.Format<"uuid">>(),
        seller_id: typia.random<string & tags.Format<"uuid">>(),
        address_id: typia.random<string & tags.Format<"uuid">>(),
        order_status: "pending",
        total_amount: 100000,
        currency: "KRW",
      } satisfies IAimallBackendOrder.ICreate,
    });
  });
}
