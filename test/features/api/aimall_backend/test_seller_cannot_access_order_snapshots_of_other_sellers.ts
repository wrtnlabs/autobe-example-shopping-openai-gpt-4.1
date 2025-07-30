import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrder";
import type { IPageIAimallBackendOrderSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendOrderSnapshot";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAimallBackendOrderSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrderSnapshot";

/**
 * Validate that a seller cannot access order snapshots belonging to another
 * seller.
 *
 * This test ensures that cross-seller access control is enforced on the
 * `/aimall-backend/seller/orders/{orderId}/orderSnapshots` endpoint. Two
 * different sellers will each create an order. Seller A will attempt to fetch
 * the order snapshots for Seller B's order — this should result in an
 * authorization error.
 *
 * Test Steps:
 *
 * 1. Create Order 1 as Seller A.
 * 2. Create Order 2 as Seller B.
 * 3. Seller A tries to fetch order snapshots for Order 2 (should fail with
 *    authorization error).
 */
export async function test_api_aimall_backend_test_seller_cannot_access_order_snapshots_of_other_sellers(
  connection: api.IConnection,
) {
  // Step 1: Create Order 1 as Seller A
  const sellerAId: string = typia.random<string & tags.Format<"uuid">>();
  const customerAId: string = typia.random<string & tags.Format<"uuid">>();
  const addressAId: string = typia.random<string & tags.Format<"uuid">>();

  const orderA = await api.functional.aimall_backend.seller.orders.create(
    connection,
    {
      body: {
        customer_id: customerAId,
        seller_id: sellerAId,
        address_id: addressAId,
        order_status: "pending",
        total_amount: 10000,
        currency: "KRW",
      } satisfies IAimallBackendOrder.ICreate,
    },
  );
  typia.assert(orderA);

  // Step 2: Create Order 2 as Seller B
  const sellerBId: string = typia.random<string & tags.Format<"uuid">>();
  const customerBId: string = typia.random<string & tags.Format<"uuid">>();
  const addressBId: string = typia.random<string & tags.Format<"uuid">>();

  const orderB = await api.functional.aimall_backend.seller.orders.create(
    connection,
    {
      body: {
        customer_id: customerBId,
        seller_id: sellerBId,
        address_id: addressBId,
        order_status: "pending",
        total_amount: 20000,
        currency: "KRW",
      } satisfies IAimallBackendOrder.ICreate,
    },
  );
  typia.assert(orderB);

  // Step 3: Seller A attempts to fetch order snapshots for Seller B's Order
  // Assume `connection` is authenticated as Seller A. Since Seller A does not own orderB,
  // this should fail with authorization error.
  await TestValidator.error("Seller A cannot view order snapshots of Seller B")(
    async () => {
      await api.functional.aimall_backend.seller.orders.orderSnapshots.index(
        connection,
        {
          orderId: orderB.id,
        },
      );
    },
  );
}
