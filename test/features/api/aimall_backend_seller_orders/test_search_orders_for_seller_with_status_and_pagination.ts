import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrder";
import type { IPageIAimallBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendOrder";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Test searching and listing seller's orders with order status filtering and
 * pagination.
 *
 * This test verifies that an authenticated seller can correctly retrieve only
 * their own orders, filter by order status (e.g., "pending"/"shipped"), and use
 * pagination controls. It also verifies that a seller cannot access another
 * seller's orders by using a different seller_id filter.
 *
 * **Tested behaviors:**
 *
 * 1. Orders for the authenticated seller with status "pending" can be listed
 *    (limited/paged)
 * 2. Orders for the authenticated seller with status "shipped" can be listed
 *    (limited/paged)
 * 3. Orders for other sellers must NOT show up (regardless of status)
 * 4. Attempts to query by another seller_id must be forbidden or otherwise
 *    restricted
 *
 * **Caveats/Assumptions:**
 *
 * - There is no public API for seller/user or order creation, so the test assumes
 *   some fixture data already exists in the DB with various combinations of
 *   status and different seller_id
 * - The authentication context in `connection` is assumed to supply a valid
 *   seller principal; seller_id is not available directly so the test validates
 *   only that the returned seller_ids are same for all orders in the page
 * - If there are no matching records, the assertions will still pass as no
 *   mismatches will be detected
 *
 * **Test Steps:**
 *
 * 1. Query for own seller orders where order_status="pending", limit=2, page=1
 * 2. Assert all orders returned have the same seller_id and order_status="pending"
 * 3. Query for own seller orders where order_status="shipped", limit=2, page=1
 * 4. Assert all orders returned have the same seller_id and order_status="shipped"
 * 5. Attempt to search using a different seller_id (random UUID) and verify
 *    forbidden or access denied
 */
export async function test_api_aimall_backend_seller_orders_test_search_orders_for_seller_with_status_and_pagination(
  connection: api.IConnection,
) {
  // Step 1: List 'pending' orders for authenticated seller (limit=2, page=1)
  const pending = await api.functional.aimall_backend.seller.orders.search(
    connection,
    {
      body: {
        order_status: "pending",
        limit: 2,
        page: 1,
      },
    },
  );
  typia.assert(pending);
  // Assert all returned orders have the same seller_id and are 'pending'
  const sellerId = pending.data.length > 0 ? pending.data[0].seller_id : null;
  for (const order of pending.data) {
    TestValidator.equals("order seller_id matches")(order.seller_id)(sellerId);
    TestValidator.equals("order status: pending")(order.order_status)(
      "pending",
    );
  }
  // Optionally validate pagination
  if (pending.data.length > 0) {
    TestValidator.equals("current page is 1")(pending.pagination.current)(1);
    TestValidator.equals("per page limit is 2")(pending.pagination.limit)(2);
  }

  // Step 2: List 'shipped' orders for same seller
  const shipped = await api.functional.aimall_backend.seller.orders.search(
    connection,
    {
      body: {
        order_status: "shipped",
        limit: 2,
        page: 1,
      },
    },
  );
  typia.assert(shipped);
  // Assert all returned orders have the same seller_id and are 'shipped'
  if (shipped.data.length > 0) {
    TestValidator.equals("seller id matches")(shipped.data[0].seller_id)(
      sellerId,
    );
  }
  for (const order of shipped.data) {
    TestValidator.equals("order seller_id matches")(order.seller_id)(sellerId);
    TestValidator.equals("order status: shipped")(order.order_status)(
      "shipped",
    );
  }
  if (shipped.data.length > 0) {
    TestValidator.equals("current page is 1")(shipped.pagination.current)(1);
    TestValidator.equals("per page limit is 2")(shipped.pagination.limit)(2);
  }

  // Step 3: Attempt to search using different seller_id (simulating forbidden query)
  const forbiddenSellerId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("forbidden accessing other seller's orders")(
    async () => {
      await api.functional.aimall_backend.seller.orders.search(connection, {
        body: {
          seller_id: forbiddenSellerId,
          order_status: "pending",
          limit: 2,
          page: 1,
        },
      });
    },
  );
}
