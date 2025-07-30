import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSeller";
import type { IAimallBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrder";

/**
 * Test updating an order as a seller using a non-existent orderId.
 *
 * Scenario: A seller attempts to update the details of an order that does not
 * exist in the system. The API should respond with a 404 Not Found error, and
 * no update should be performed.
 *
 * Steps:
 *
 * 1. Register a new seller (precondition, since update is performed by seller
 *    context).
 * 2. Attempt to update a non-existent order (using a random UUID as orderId) with
 *    a minimal valid update (only required field 'updated_at').
 * 3. Assert that the API responds with an error — confirming appropriate error
 *    handling for missing resources.
 *
 * This validates proper "not found" error response for sellers updating orders
 * that do not exist.
 */
export async function test_api_aimall_backend_seller_orders_test_update_order_by_seller_for_nonexistent_order_should_return_not_found(
  connection: api.IConnection,
) {
  // 1. Register a new seller to satisfy seller context requirement
  const sellerInput = {
    business_name: RandomGenerator.alphabets(8),
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

  // 2. Attempt to update (PUT) a non-existent order by random UUID
  const nonExistentOrderId = typia.random<string & tags.Format<"uuid">>();
  const updateBody = {
    updated_at: new Date().toISOString(),
  } satisfies IAimallBackendOrder.IUpdate;

  // 3. Assert API returns an error (should be 404 Not Found for non-existent order)
  await TestValidator.error("should return 404 for non-existent order")(() =>
    api.functional.aimall_backend.seller.orders.update(connection, {
      orderId: nonExistentOrderId,
      body: updateBody,
    }),
  );
}
