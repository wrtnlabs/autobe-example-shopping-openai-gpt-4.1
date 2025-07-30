import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSeller";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrder";
import type { IAimallBackendOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrderItem";

/**
 * Validates adding a new order item to an order by a seller, including all
 * pre-requisites and correct data association.
 *
 * Business scenario:
 *
 * - Seller must be registered and present in the system.
 * - Order must exist for this seller (ownership must match).
 * - Product must exist in catalog and belong to seller.
 * - Order item addition contains correct product information and valid
 *   quantities/prices.
 * - Order item is created successfully, data matches input, and order association
 *   is correct.
 *
 * Steps:
 *
 * 1. Register a new seller (with unique business name/email/etc).
 * 2. Add a new product for this seller (pick a valid category/product attributes
 *    for realism).
 * 3. Create an order for this seller (can use any mock/uuid for customer/address).
 * 4. Add an order item to this order using the product above, with valid quantity
 *    and pricing.
 * 5. Validate returned order item for accurate product binding, quantity, item
 *    details, price calculations, order association. Optionally, check if order
 *    total increases or other aggregate adjustments, if visible in available
 *    API.
 */
export async function test_api_aimall_backend_test_add_order_item_to_order_with_valid_product_and_quantity(
  connection: api.IConnection,
) {
  // 1. Register seller
  const sellerEmail: string = typia.random<string & tags.Format<"email">>();
  const seller =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      {
        body: {
          business_name: RandomGenerator.alphabets(10),
          email: sellerEmail,
          contact_phone: RandomGenerator.mobile(),
          status: "approved",
        } satisfies IAimallBackendSeller.ICreate,
      },
    );
  typia.assert(seller);

  // 2. Create a product for this seller
  // Generate a fake category UUID for test linkage
  const categoryId: string = typia.random<string & tags.Format<"uuid">>();
  const product =
    await api.functional.aimall_backend.administrator.products.create(
      connection,
      {
        body: {
          category_id: categoryId,
          seller_id: seller.id,
          title: RandomGenerator.paragraph()(1),
          description: RandomGenerator.content()()(1),
          status: "active",
        } satisfies IAimallBackendProduct.ICreate,
      },
    );
  typia.assert(product);

  // 3. Create an order for this seller
  const order = await api.functional.aimall_backend.administrator.orders.create(
    connection,
    {
      body: {
        customer_id: typia.random<string & tags.Format<"uuid">>(),
        seller_id: seller.id,
        address_id: typia.random<string & tags.Format<"uuid">>(),
        order_number: `ORD-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-0001`,
        order_status: "pending",
        total_amount: 0,
        currency: "KRW",
      } satisfies IAimallBackendOrder.ICreate,
    },
  );
  typia.assert(order);

  // 4. Add an order item as seller to this order
  const quantity = 2;
  const unit_price = 15000;
  const orderItemCreate = {
    product_id: product.id,
    item_name: product.title,
    quantity,
    unit_price,
    total_price: quantity * unit_price,
  } satisfies IAimallBackendOrderItem.ICreate;

  const addedItem =
    await api.functional.aimall_backend.seller.orders.orderItems.create(
      connection,
      {
        orderId: order.id,
        body: orderItemCreate,
      },
    );
  typia.assert(addedItem);
  TestValidator.equals("product_id")(addedItem.product_id)(product.id);
  TestValidator.equals("order_id")(addedItem.order_id)(order.id);
  TestValidator.equals("quantity")(addedItem.quantity)(quantity);
  TestValidator.equals("unit_price")(addedItem.unit_price)(unit_price);
  TestValidator.equals("total_price")(addedItem.total_price)(
    quantity * unit_price,
  );
  TestValidator.equals("item_name")(addedItem.item_name)(product.title);
}
