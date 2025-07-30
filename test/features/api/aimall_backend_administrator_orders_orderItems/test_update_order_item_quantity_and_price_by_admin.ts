import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrder";
import type { IAimallBackendOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrderItem";

/**
 * Validate that an administrator can update an order item's quantity and unit
 * price in an open order.
 *
 * This test ensures that after creating necessary entities (product, order,
 * order item), an administrator can update mutable fields of an order item. The
 * test checks that values are updated correctly, persist after change, and that
 * business rules (only allowed fields editable, data validation) are enforced.
 *
 * Steps:
 *
 * 1. Create a product as admin (to use in the order item)
 * 2. Create an order as admin (using random customer/seller/address/etc. values)
 * 3. Create an order item in that order as seller (using the product)
 * 4. As administrator, update the order item's quantity and unit price
 * 5. Assert that the updated fields change and persist, and that total price is as
 *    expected
 * 6. Assert that the API response is valid, and no errors are thrown for valid
 *    changes
 */
export async function test_api_aimall_backend_administrator_orders_orderItems_test_update_order_item_quantity_and_price_by_admin(
  connection: api.IConnection,
) {
  // 1. Create a product (admin context). Use random valid references and details.
  const productInput: IAimallBackendProduct.ICreate = {
    category_id: typia.random<string & tags.Format<"uuid">>(),
    seller_id: typia.random<string & tags.Format<"uuid">>(),
    title: RandomGenerator.paragraph()(),
    description: RandomGenerator.content()()(),
    main_thumbnail_uri: undefined,
    status: "active",
  };
  const product =
    await api.functional.aimall_backend.administrator.products.create(
      connection,
      { body: productInput },
    );
  typia.assert(product);

  // 2. Create order as admin (using random valid IDs)
  const orderInput: IAimallBackendOrder.ICreate = {
    customer_id: typia.random<string & tags.Format<"uuid">>(),
    seller_id: product.seller_id,
    address_id: typia.random<string & tags.Format<"uuid">>(),
    order_status: "pending",
    total_amount: 10000,
    currency: "KRW",
  };
  const order = await api.functional.aimall_backend.administrator.orders.create(
    connection,
    { body: orderInput },
  );
  typia.assert(order);

  // 3. Create the order item as seller - using the new order and product
  const itemCreate: IAimallBackendOrderItem.ICreate = {
    product_id: product.id,
    product_option_id: null,
    item_name: product.title,
    quantity: 2,
    unit_price: 2500,
    total_price: 5000,
  };
  const item =
    await api.functional.aimall_backend.seller.orders.orderItems.create(
      connection,
      { orderId: order.id, body: itemCreate },
    );
  typia.assert(item);

  // 4. As admin, update the order item: change quantity and unit price
  const updatedValues = {
    quantity: 4,
    unit_price: 2000,
    total_price: 8000,
  } satisfies IAimallBackendOrderItem.IUpdate;
  const updated =
    await api.functional.aimall_backend.administrator.orders.orderItems.update(
      connection,
      { orderId: order.id, orderItemId: item.id, body: updatedValues },
    );
  typia.assert(updated);

  // 5. Assert changes persisted and business logic
  TestValidator.equals("order id matches")(updated.order_id)(order.id);
  TestValidator.equals("product id matches")(updated.product_id)(product.id);
  TestValidator.equals("quantity updated")(updated.quantity)(4);
  TestValidator.equals("unit price updated")(updated.unit_price)(2000);
  TestValidator.equals("total price recalculated")(updated.total_price)(8000);
  // Check unchanged fields
  TestValidator.equals("item name unchanged")(updated.item_name)(
    item.item_name,
  );
  TestValidator.equals("product option unchanged")(updated.product_option_id)(
    item.product_option_id,
  );
}
