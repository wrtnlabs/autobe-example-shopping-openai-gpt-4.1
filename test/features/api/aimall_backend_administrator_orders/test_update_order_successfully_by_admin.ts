import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrder";

/**
 * Test updating an order as an administrator.
 *
 * This E2E test ensures that an administrator can successfully update an order
 * using the admin API. It covers the following business flow:
 *
 * 1. Create a customer (prerequisite for the order)
 * 2. Create a product (to assign proper foreign keys; uses test UUIDs for category
 *    and seller fields)
 * 3. Create an order using the new customer and product
 * 4. Update mutable fields on the order (e.g., order_status, total_amount)
 * 5. Validate changes are reflected in the updated order
 * 6. Confirm that unchanged fields did not change
 * 7. Ensure the updated_at audit field is properly updated
 */
export async function test_api_aimall_backend_administrator_orders_test_update_order_successfully_by_admin(
  connection: api.IConnection,
) {
  // 1. Create a customer for the order
  const customer = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        phone: RandomGenerator.mobile(),
        password_hash: "hashedpassword123", // Dummy hash for testing only (do not use in prod)
        status: "active",
      } satisfies IAimallBackendCustomer.ICreate,
    },
  );
  typia.assert(customer);

  // 2. Create a product (needs a valid seller and category ID)
  const product =
    await api.functional.aimall_backend.administrator.products.create(
      connection,
      {
        body: {
          category_id: typia.random<string & tags.Format<"uuid">>(),
          seller_id: typia.random<string & tags.Format<"uuid">>(),
          title: RandomGenerator.paragraph()(1),
          status: "active",
        } satisfies IAimallBackendProduct.ICreate,
      },
    );
  typia.assert(product);

  // 3. Create an order for the customer and product
  const order = await api.functional.aimall_backend.administrator.orders.create(
    connection,
    {
      body: {
        customer_id: customer.id,
        seller_id: product.seller_id,
        address_id: typia.random<string & tags.Format<"uuid">>(),
        order_status: "pending",
        total_amount: 30000,
        currency: "KRW",
      } satisfies IAimallBackendOrder.ICreate,
    },
  );
  typia.assert(order);

  // 4. Update order's mutable fields: order_status and total_amount
  const new_status = "paid";
  const new_total_amount = order.total_amount + 5000;
  const updated_at = new Date().toISOString();
  const updated =
    await api.functional.aimall_backend.administrator.orders.update(
      connection,
      {
        orderId: order.id,
        body: {
          order_status: new_status,
          total_amount: new_total_amount,
          updated_at,
        } satisfies IAimallBackendOrder.IUpdate,
      },
    );
  typia.assert(updated);

  // 5. Validate updated fields are changed
  TestValidator.equals("order_status should be updated")(updated.order_status)(
    new_status,
  );
  TestValidator.equals("total_amount should be updated")(updated.total_amount)(
    new_total_amount,
  );

  // 6. Unchanged fields remain the same
  TestValidator.equals("order id matches")(updated.id)(order.id);
  TestValidator.equals("customer id unchanged")(updated.customer_id)(
    order.customer_id,
  );
  TestValidator.equals("seller id unchanged")(updated.seller_id)(
    order.seller_id,
  );
  TestValidator.equals("currency unchanged")(updated.currency)(order.currency);

  // 7. Confirm updated_at reflects correct update timestamp
  TestValidator.predicate("updated_at advanced or equal")(
    new Date(updated.updated_at).getTime() >=
      new Date(order.updated_at).getTime(),
  );
}
