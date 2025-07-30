import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrder";

/**
 * Test admin deletion (or archival) of an order.
 *
 * This function verifies that an administrator can delete (or archive) an order
 * via the delete endpoint, after creating required dependent entities
 * (customer, product, and order). Due to the absence of a GET or listing
 * endpoint for orders in the provided SDK, only the deletion action and setup
 * can be tested directly. Further verification of removal or archiving must be
 * inferred by the API's correct execution.
 *
 * Steps:
 *
 * 1. Create a customer account
 * 2. Create a product as admin
 * 3. Create an order for the customer and product
 * 4. Delete/archive the order as administrator
 * 5. (Cannot check order nonexistence or archived_at field, as there is no
 *    read/query endpoint)
 */
export async function test_api_aimall_backend_administrator_orders_test_delete_order_by_admin_with_no_archival_field(
  connection: api.IConnection,
) {
  // 1. Create a customer for the order
  const customer = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: {
        email: `${typia.random<string>()}@example.com`,
        phone: RandomGenerator.mobile(),
        password_hash: typia.random<string>(),
        status: "active",
      } satisfies IAimallBackendCustomer.ICreate,
    },
  );
  typia.assert(customer);

  // 2. Create a product (with random seller and category)
  const product =
    await api.functional.aimall_backend.administrator.products.create(
      connection,
      {
        body: {
          category_id: typia.random<string & tags.Format<"uuid">>(),
          seller_id: typia.random<string & tags.Format<"uuid">>(),
          title: RandomGenerator.paragraph()(),
          status: "active",
        } satisfies IAimallBackendProduct.ICreate,
      },
    );
  typia.assert(product);

  // 3. Create an order (random address, fixed currency and status)
  const order = await api.functional.aimall_backend.administrator.orders.create(
    connection,
    {
      body: {
        customer_id: customer.id,
        seller_id: product.seller_id,
        address_id: typia.random<string & tags.Format<"uuid">>(),
        order_status: "pending",
        total_amount: 10000,
        currency: "KRW",
      } satisfies IAimallBackendOrder.ICreate,
    },
  );
  typia.assert(order);

  // 4. Delete/archive the order as administrator
  await api.functional.aimall_backend.administrator.orders.erase(connection, {
    orderId: order.id,
  });

  // 5. (Verification step: No query/read endpoint available; direct confirmation of archival/removal cannot be performed)
}
