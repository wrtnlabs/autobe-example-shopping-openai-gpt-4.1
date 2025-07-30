import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrder";
import type { IAimallBackendOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrderItem";

/**
 * Test that a customer cannot delete an order item once the parent order has
 * been finalized.
 *
 * This test verifies the business rule that, after an order is finalized (its
 * status updated by an administrator), its order items are immutable and a
 * customer is forbidden from deleting any item. The workflow is:
 *
 * 1. Register a new customer.
 * 2. Create a product (as admin/seller).
 * 3. Create a customer order for the product.
 * 4. Add an order item to the order.
 * 5. Finalize the order by updating its status to 'finalized' via admin API.
 * 6. Attempt to delete the order item as the customer; deletion must fail (error
 *    thrown).
 */
export async function test_api_aimall_backend_test_customer_cannot_delete_order_item_after_order_is_finalized(
  connection: api.IConnection,
) {
  // 1. Register a new customer
  const customerInput: IAimallBackendCustomer.ICreate = {
    email: typia.random<string & tags.Format<"email">>(),
    phone: RandomGenerator.mobile(),
    status: "active",
    password_hash: RandomGenerator.alphaNumeric(16),
  };
  const customer = await api.functional.aimall_backend.customers.create(
    connection,
    { body: customerInput },
  );
  typia.assert(customer);

  // 2. Create a new product (as admin/seller)
  const productInput: IAimallBackendProduct.ICreate = {
    category_id: typia.random<string & tags.Format<"uuid">>(),
    seller_id: typia.random<string & tags.Format<"uuid">>(),
    title: RandomGenerator.paragraph()(1),
    description: RandomGenerator.content()()(),
    status: "active",
  };
  const product =
    await api.functional.aimall_backend.administrator.products.create(
      connection,
      { body: productInput },
    );
  typia.assert(product);

  // 3. Create a customer order for the product
  const orderInput: IAimallBackendOrder.ICreate = {
    customer_id: customer.id,
    seller_id: product.seller_id,
    address_id: typia.random<string & tags.Format<"uuid">>(),
    order_status: "pending",
    total_amount: 10000,
    currency: "KRW",
  };
  const order = await api.functional.aimall_backend.customer.orders.create(
    connection,
    { body: orderInput },
  );
  typia.assert(order);

  // 4. Add an order item to the order
  const orderItemInput: IAimallBackendOrderItem.ICreate = {
    product_id: product.id,
    item_name: product.title,
    quantity: 1,
    unit_price: 10000,
    total_price: 10000,
  };
  const orderItem =
    await api.functional.aimall_backend.customer.orders.orderItems.create(
      connection,
      { orderId: order.id, body: orderItemInput },
    );
  typia.assert(orderItem);

  // 5. Finalize the order by updating its status as admin
  const finalizedStatus = "finalized";
  const updateOrderInput: IAimallBackendOrder.IUpdate = {
    order_status: finalizedStatus,
    updated_at: new Date().toISOString() as string & tags.Format<"date-time">,
  };
  const updatedOrder =
    await api.functional.aimall_backend.administrator.orders.update(
      connection,
      { orderId: order.id, body: updateOrderInput },
    );
  typia.assert(updatedOrder);

  // 6. Attempt to delete the order item as the customer; deletion must fail
  await TestValidator.error("cannot delete order item from finalized order")(
    async () => {
      await api.functional.aimall_backend.customer.orders.orderItems.erase(
        connection,
        { orderId: order.id, orderItemId: orderItem.id },
      );
    },
  );
}
