import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrder";

/**
 * E2E test for administrator double-deletion/archive of an order.
 *
 * This test validates that after successfully deleting (or archiving) an order
 * as an administrator, any subsequent attempt to delete the same order again
 * will fail with an appropriate error, confirming that the system properly
 * prevents double archival/deletion and maintains correct business state.
 *
 * **Steps:**
 *
 * 1. Register a customer (for association to the order).
 * 2. Register a product (for association to the order).
 * 3. As admin, create an order for the customer, associated with the product's
 *    seller.
 * 4. Delete (archive) the order as admin (should succeed).
 * 5. Attempt to delete (archive) the same order again as admin (should fail with
 *    error, as already deleted/archived).
 */
export async function test_api_aimall_backend_administrator_orders_test_delete_order_by_admin_for_archived_order_should_fail(
  connection: api.IConnection,
) {
  // 1. Register a customer
  const customer = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        phone: RandomGenerator.mobile(),
        password_hash: null,
        status: "active",
      } satisfies IAimallBackendCustomer.ICreate,
    },
  );
  typia.assert(customer);

  // 2. Register a product (needs a seller_id and category_id, generate both)
  const seller_id = typia.random<string & tags.Format<"uuid">>();
  const category_id = typia.random<string & tags.Format<"uuid">>();
  const product =
    await api.functional.aimall_backend.administrator.products.create(
      connection,
      {
        body: {
          category_id,
          seller_id,
          title: RandomGenerator.paragraph()(2),
          description: RandomGenerator.content()()(),
          main_thumbnail_uri: undefined,
          status: "active",
        } satisfies IAimallBackendProduct.ICreate,
      },
    );
  typia.assert(product);

  // 3. Create an order (admin flow)
  const address_id = typia.random<string & tags.Format<"uuid">>();
  const order = await api.functional.aimall_backend.administrator.orders.create(
    connection,
    {
      body: {
        customer_id: customer.id,
        seller_id: product.seller_id,
        address_id,
        order_status: "pending",
        total_amount: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<1000000>
        >(),
        currency: "KRW",
      } satisfies IAimallBackendOrder.ICreate,
    },
  );
  typia.assert(order);

  // 4. Delete/archive the order (should succeed)
  await api.functional.aimall_backend.administrator.orders.erase(connection, {
    orderId: order.id,
  });

  // 5. Attempt to delete/archive again (should fail with an error)
  await TestValidator.error(
    "Second delete/archive attempt must fail for already archived/deleted order",
  )(async () => {
    await api.functional.aimall_backend.administrator.orders.erase(connection, {
      orderId: order.id,
    });
  });
}
