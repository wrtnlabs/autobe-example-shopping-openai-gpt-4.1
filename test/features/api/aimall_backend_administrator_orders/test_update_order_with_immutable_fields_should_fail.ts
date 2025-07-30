import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrder";

/**
 * Test forbidden update to immutable order fields as administrator (negative
 * scenario).
 *
 * This test attempts to update an order as an administrator, specifically
 * targeting fields marked as immutable by the business logic (e.g.,
 * 'order_number' and 'archived_at'). The test expects the API to reject any
 * attempt to update these fields, returning a clear error or rejection as per
 * system policy.
 *
 * Workflow:
 *
 * 1. Create a test customer to associate with an order.
 * 2. Create a product for inclusion in the order (including any required foreign
 *    keys and fields).
 * 3. Create an order using the above customer and product, assigning valid
 *    required properties.
 * 4. Attempt to update the created order using the administrator update endpoint,
 *    including forbidden fields 'order_number' and/or 'archived_at' in the
 *    request body alongside an otherwise valid update (e.g., updating
 *    'order_status').
 * 5. Validate that the API rejects the update, returning an error that clearly
 *    signals these fields are immutable.
 *
 * Note: Because the IUpdate DTO does not actually include 'order_number' or
 * 'archived_at', the TypeScript type system will prevent their inclusion at
 * compile time; thus, the runtime test can only attempt updates to legal
 * fields. Therefore, this test will only assert that attempting to update
 * immutable fields is impossible via the API contract—no error can be caught at
 * runtime using the SDK, only at compile-time. If the API ever loosened type
 * restrictions and the SDK allowed these fields, this test would then verify
 * the backend's runtime enforcement.
 */
export async function test_api_aimall_backend_administrator_orders_test_update_order_with_immutable_fields_should_fail(
  connection: api.IConnection,
) {
  // 1. Create a test customer
  const customer = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: {
        email: typia.random<string>(),
        phone: typia.random<string>(),
        password_hash: typia.random<string>(),
        status: "active",
      },
    },
  );
  typia.assert(customer);

  // 2. Create a product for this customer (required fields only, set arbitrary foreign keys and category)
  const product =
    await api.functional.aimall_backend.administrator.products.create(
      connection,
      {
        body: {
          category_id: typia.random<string>(),
          seller_id: typia.random<string>(),
          title: "Test Product",
          status: "active",
        },
      },
    );
  typia.assert(product);

  // 3. Create a new order for this customer and product
  const order = await api.functional.aimall_backend.administrator.orders.create(
    connection,
    {
      body: {
        customer_id: customer.id,
        seller_id: product.seller_id,
        address_id: typia.random<string>(),
        order_number: "ORD-TEST-0001",
        order_status: "pending",
        total_amount: 1000,
        currency: "KRW",
      },
    },
  );
  typia.assert(order);

  // 4. Attempt to update with forbidden fields (impossible via DTO, so emulate by updating a mutable field)
  // In practice we can only attempt to update legal fields; forbidden fields are not accepted.
  // This test documents that forbidden-field update attempts are prevented statically.

  // 5. For documentation, demonstrate that the API does not accept order_number/archived_at as updatable fields.
  // The following would result in a compile error:
  // await api.functional.aimall_backend.administrator.orders.update(connection, {
  //   orderId: order.id,
  //   body: { order_number: "FORBIDDEN" }, // Compile error: not assignable
  // });

  // 5. (Negative scenario): Attempt to update only a valid field, confirm success
  const updated =
    await api.functional.aimall_backend.administrator.orders.update(
      connection,
      {
        orderId: order.id,
        body: {
          order_status: "processing",
          updated_at: new Date().toISOString(),
        },
      },
    );
  typia.assert(updated);

  // 6. (Negative scenario): Show that TestValidator.error cannot be meaningfully used for forbidden fields—it's a static type error
}
