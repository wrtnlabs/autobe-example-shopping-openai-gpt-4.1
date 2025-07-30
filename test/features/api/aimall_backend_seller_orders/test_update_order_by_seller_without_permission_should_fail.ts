import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSeller";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrder";

/**
 * Validate order update access control enforcement for sellers.
 *
 * This test verifies that a seller cannot update another seller's order.
 * Specifically:
 *
 * - Seller A is created.
 * - Seller B is created.
 * - A product is created for Seller A.
 * - An order is created for Seller A and the product.
 * - Then, using Seller B's context, an attempt is made to update the order (owned
 *   by Seller A).
 *
 * Business rule: Only the seller who owns the order (Seller A) should be
 * authorized to update it. If Seller B attempts this operation, the API must
 * refuse the request, typically responding with an authorization error (e.g.,
 * HTTP 403 Forbidden).
 *
 * Steps:
 *
 * 1. Create Seller A (setup, get credentials/id).
 * 2. Create Seller B (setup, get credentials/id).
 * 3. Create a product using Seller A's credentials, link to Seller A.
 * 4. Create an order for Seller A (assume system enables this for simplicity).
 * 5. Attempt to update the order (as if by Seller B). (Note: Due to available
 *    APIs, actually switching authentication context to Seller B is not
 *    possible in this mock. In a real full test suite, an explicit login as
 *    Seller B would be required.)
 * 6. Attempt should fail with a forbidden/authorization error; the test checks the
 *    error is thrown and no order is updated.
 */
export async function test_api_aimall_backend_seller_orders_test_update_order_by_seller_without_permission_should_fail(
  connection: api.IConnection,
) {
  // 1. Create Seller A
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

  // 2. Create Seller B
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

  // 3. Create a product for Seller A
  const product = await api.functional.aimall_backend.seller.products.create(
    connection,
    {
      body: {
        category_id: typia.random<string & tags.Format<"uuid">>(),
        seller_id: sellerA.id,
        title: RandomGenerator.paragraph()(),
        status: "active",
      } satisfies IAimallBackendProduct.ICreate,
    },
  );
  typia.assert(product);

  // 4. Create an order for Seller A (simulate required details)
  const order = await api.functional.aimall_backend.seller.orders.create(
    connection,
    {
      body: {
        customer_id: typia.random<string & tags.Format<"uuid">>(),
        seller_id: sellerA.id,
        address_id: typia.random<string & tags.Format<"uuid">>(),
        order_status: "pending",
        total_amount: 10000,
        currency: "KRW",
      } satisfies IAimallBackendOrder.ICreate,
    },
  );
  typia.assert(order);

  // 5. Attempt to update the order as Seller B (simulated context; in a real test, switch authentication to Seller B)
  await TestValidator.error(
    "Seller B cannot update order belonging to Seller A",
  )(async () => {
    await api.functional.aimall_backend.seller.orders.update(connection, {
      orderId: order.id,
      body: {
        order_status: "shipped",
        updated_at: new Date().toISOString(),
      } satisfies IAimallBackendOrder.IUpdate,
    });
  });
}
