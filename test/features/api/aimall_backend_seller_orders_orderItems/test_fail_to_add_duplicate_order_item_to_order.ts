import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSeller";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrder";
import type { IAimallBackendOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrderItem";

/**
 * Validate that the system prevents adding a duplicate order item (same product
 * and option/SKU) to an existing order.
 *
 * Business Context: In the AIMall system, a single order cannot have two order
 * item lines with exactly the same product (and product option/SKU, if
 * applicable). This test ensures the back-end enforces that unique constraint.
 *
 * Step-by-step process:
 *
 * 1. Register a seller account to own products and handle order management.
 * 2. Create a product for the seller with a randomly generated title.
 * 3. Generate a random customer_id and delivery address_id (since no
 *    customer/address modules are exposed in the test scope).
 * 4. Create an order for the seller/customer/address.
 * 5. Add the first order item for the product (no product_option/SKU in this
 *    minimal example).
 * 6. Attempt to add a second, duplicate order item with the same
 *    product/product_option in the same order. This should trigger a constraint
 *    violation.
 * 7. Validate that a runtime error occurs, confirming that duplicates are not
 *    allowed.
 */
export async function test_api_aimall_backend_seller_orders_orderItems_test_fail_to_add_duplicate_order_item_to_order(
  connection: api.IConnection,
) {
  // 1. Register a seller account
  const seller =
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
  typia.assert(seller);

  // 2. Create a product for the seller
  const product =
    await api.functional.aimall_backend.administrator.products.create(
      connection,
      {
        body: {
          category_id: typia.random<string & tags.Format<"uuid">>(),
          seller_id: seller.id,
          title: RandomGenerator.alphaNumeric(12),
          status: "active",
        } satisfies IAimallBackendProduct.ICreate,
      },
    );
  typia.assert(product);

  // 3. Generate a random customer and address UUIDs
  const customer_id = typia.random<string & tags.Format<"uuid">>();
  const address_id = typia.random<string & tags.Format<"uuid">>();

  // 4. Create a new order
  const order = await api.functional.aimall_backend.administrator.orders.create(
    connection,
    {
      body: {
        customer_id,
        seller_id: seller.id,
        address_id,
        order_status: "pending",
        total_amount: 12345,
        currency: "KRW",
      } satisfies IAimallBackendOrder.ICreate,
    },
  );
  typia.assert(order);

  // 5. Add the initial order item
  const orderItemInput: IAimallBackendOrderItem.ICreate = {
    product_id: product.id,
    product_option_id: null, // No variant for this test
    item_name: product.title,
    quantity: 1,
    unit_price: 100,
    total_price: 100,
  };
  const orderItem =
    await api.functional.aimall_backend.seller.orders.orderItems.create(
      connection,
      {
        orderId: order.id,
        body: orderItemInput,
      },
    );
  typia.assert(orderItem);

  // 6. Attempt to add a duplicate order item
  await TestValidator.error("duplicate order item should trigger error")(
    async () => {
      await api.functional.aimall_backend.seller.orders.orderItems.create(
        connection,
        {
          orderId: order.id,
          body: orderItemInput,
        },
      );
    },
  );
}
