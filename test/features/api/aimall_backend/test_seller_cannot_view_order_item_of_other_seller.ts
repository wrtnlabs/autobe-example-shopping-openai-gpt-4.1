import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrder";
import type { IAimallBackendOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrderItem";

/**
 * Validate that a seller cannot retrieve order item information for an order
 * they do not own.
 *
 * Business context: In an e-commerce context, sellers must not be able to view
 * order or order item details from other sellers. This is critical for privacy
 * and data security. This test ensures cross-account access is forbidden and
 * enforced at the API level (403/404 response).
 *
 * Test process:
 *
 * 1. (Set up Seller A context) Create an order as Seller A.
 * 2. Add an order item to Seller A's order.
 * 3. Simulate Seller B (different seller) by modifying the connection context
 *    (since no authentication API is provided). Seller B attempts to access the
 *    order item detail.
 * 4. Assert that Seller B receives an error response (forbidden or not found) and
 *    never receives order item data for another seller's order.
 */
export async function test_api_aimall_backend_test_seller_cannot_view_order_item_of_other_seller(
  connection: api.IConnection,
) {
  // 1. Seller A (order owner) creates an order
  const sellerA_id = typia.random<string & tags.Format<"uuid">>();
  const orderA = await api.functional.aimall_backend.seller.orders.create(
    connection,
    {
      body: {
        customer_id: typia.random<string & tags.Format<"uuid">>(),
        seller_id: sellerA_id,
        address_id: typia.random<string & tags.Format<"uuid">>(),
        order_status: "pending",
        total_amount: 123450,
        currency: "KRW",
      } satisfies IAimallBackendOrder.ICreate,
    },
  );
  typia.assert(orderA);

  // 2. Add order item to Seller A's order
  const product_id = typia.random<string & tags.Format<"uuid">>();
  const orderItemA =
    await api.functional.aimall_backend.seller.orders.orderItems.create(
      connection,
      {
        orderId: orderA.id,
        body: {
          product_id,
          item_name: "테스트 상품",
          quantity: 2,
          unit_price: 55555,
          total_price: 111110,
        } satisfies IAimallBackendOrderItem.ICreate,
      },
    );
  typia.assert(orderItemA);

  // 3. Simulate as Seller B: modify connection's seller_id (in reality, actual authentication/authorization switching is required; here only simulated)
  const sellerB_id = typia.random<string & tags.Format<"uuid">>();
  const connectionB = {
    ...connection,
    headers: {
      ...connection.headers,
      "x-seller-id": sellerB_id, // Simulate different seller context
    },
  };

  // 4. Attempt order item retrieval as Seller B -- must error (forbidden/not found), order item must NOT be visible
  await TestValidator.error(
    "seller B cannot view order item belonging to seller A",
  )(() =>
    api.functional.aimall_backend.seller.orders.orderItems.at(connectionB, {
      orderId: orderA.id,
      orderItemId: orderItemA.id,
    }),
  );
}
