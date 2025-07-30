import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSeller";
import type { IAimallBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrder";
import type { IAimallBackendOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrderItem";

/**
 * Validate that sellers cannot add items to orders they do not own.
 *
 * This test ensures that a seller (Seller B) is forbidden from adding an order
 * item to an order that belongs to another seller (Seller A), enforcing strict
 * authorization.
 *
 * **Steps:**
 *
 * 1. Register Seller A
 * 2. Register Seller B
 * 3. Simulate an existing customer and delivery address UUID
 * 4. Create an order for Seller A from admin
 * 5. Attempt to add an order item to Seller A's order as Seller B, expecting a
 *    permission error and no item creation
 *
 * The system is expected to reject Seller B's operation with an authorization
 * error.
 */
export async function test_api_aimall_backend_test_add_order_item_to_order_without_permission_fails(
  connection: api.IConnection,
) {
  // 1. Register Seller A
  const sellerA =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      {
        body: {
          business_name: "Seller A " + RandomGenerator.alphaNumeric(6),
          email: RandomGenerator.alphaNumeric(8) + "@sellerA.com",
          contact_phone: "010" + RandomGenerator.alphaNumeric(8),
          status: "approved",
        },
      },
    );
  typia.assert(sellerA);

  // 2. Register Seller B
  const sellerB =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      {
        body: {
          business_name: "Seller B " + RandomGenerator.alphaNumeric(6),
          email: RandomGenerator.alphaNumeric(8) + "@sellerB.com",
          contact_phone: "010" + RandomGenerator.alphaNumeric(8),
          status: "approved",
        },
      },
    );
  typia.assert(sellerB);

  // 3. Simulate customer and address UUIDs, as APIs do not exist
  const customer_id = typia.random<string & tags.Format<"uuid">>();
  const address_id = typia.random<string & tags.Format<"uuid">>();

  // 4. Create an order for Seller A
  const order = await api.functional.aimall_backend.administrator.orders.create(
    connection,
    {
      body: {
        customer_id,
        seller_id: sellerA.id,
        address_id,
        order_number: "ORD-" + new Date().toISOString(),
        order_status: "pending",
        total_amount: 100000,
        currency: "KRW",
      },
    },
  );
  typia.assert(order);

  // 5. Attempt to add an order item as Seller B; expect error
  await TestValidator.error("seller B cannot add item to seller A order")(
    async () => {
      await api.functional.aimall_backend.seller.orders.orderItems.create(
        connection,
        {
          orderId: order.id,
          body: {
            product_id: typia.random<string & tags.Format<"uuid">>(),
            product_option_id: null,
            item_name: "Unauthorized Product",
            quantity: 1,
            unit_price: 1000,
            total_price: 1000,
          },
        },
      );
    },
  );
}
