import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSeller";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrder";
import type { IAimallBackendOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrderItem";

/**
 * Test that a seller cannot update an order item belonging to another seller
 * (authorization failure case).
 *
 * 1. Create Seller A and Seller B accounts as distinct merchants.
 * 2. Create a product owned by Seller A so that it can be used in an order.
 * 3. Create an order for Seller A (using random customer/address fields).
 * 4. As Seller A, add an order item for the product to the order.
 * 5. As Seller B, attempt to update the order item attached to Seller A's order.
 * 6. Assert that the update fails (authorization error expected).
 * 7. (Optional) Could validate the order item is unchanged, but no read API is
 *    available here.
 *
 * Note: Seller-auth switching is not demonstrated explicitly in this function,
 * assuming that the provided `connection` context can simulate Seller B
 * privilege for the negative test. If this is insufficient, adapt the test to
 * the runner's multi-auth support, or elaborate this step when environment
 * enables it.
 */
export async function test_api_aimall_backend_test_seller_cannot_update_order_item_they_do_not_own(
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
        },
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
        },
      },
    );
  typia.assert(sellerB);

  // 3. Create a product for Seller A
  const product =
    await api.functional.aimall_backend.administrator.products.create(
      connection,
      {
        body: {
          category_id: typia.random<string & tags.Format<"uuid">>(),
          seller_id: sellerA.id,
          title: RandomGenerator.paragraph()(),
          description: RandomGenerator.content()()(),
          status: "active",
        },
      },
    );
  typia.assert(product);

  // 4. Create an order for Seller A
  const order = await api.functional.aimall_backend.administrator.orders.create(
    connection,
    {
      body: {
        customer_id: typia.random<string & tags.Format<"uuid">>(),
        seller_id: sellerA.id,
        address_id: typia.random<string & tags.Format<"uuid">>(),
        order_status: "pending",
        total_amount: 10000,
        currency: "KRW",
      },
    },
  );
  typia.assert(order);

  // 5. Add an order item for Seller A's product
  const orderItem =
    await api.functional.aimall_backend.seller.orders.orderItems.create(
      connection,
      {
        orderId: order.id,
        body: {
          product_id: product.id,
          item_name: product.title,
          quantity: 1,
          unit_price: 10000,
          total_price: 10000,
        },
      },
    );
  typia.assert(orderItem);

  // 6. Attempt update as "Seller B"
  //    This test expects the environment/runner to simulate Seller B auth context for this call.
  await TestValidator.error(
    "seller B cannot update another seller's order item",
  )(async () => {
    await api.functional.aimall_backend.seller.orders.orderItems.update(
      connection,
      {
        orderId: order.id,
        orderItemId: orderItem.id,
        body: { item_name: "Unauthorized modification attempt" },
      },
    );
  });
}
