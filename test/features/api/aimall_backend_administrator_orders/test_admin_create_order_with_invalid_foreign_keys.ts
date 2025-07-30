import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrder";

/**
 * Validate administrator order creation with non-existent foreign key
 * references.
 *
 * This test ensures that creating an order as an administrator using IDs for
 * customer, seller, or shipping address that do not exist in the database fails
 * with the correct validation or business logic error. It also covers the
 * scenario where all three references are invalid at once, confirming that
 * referential/foreign key integrity checks are strictly enforced for creation
 * requests from the admin side.
 *
 * Step-by-step process:
 *
 * 1. Prepare three UUIDs that are guaranteed not to reference real customer,
 *    seller, or address records.
 * 2. Construct a valid order creation request body using those fake UUIDs for
 *    customer_id, seller_id, and address_id. Populate other required business
 *    fields with valid values.
 * 3. Attempt to create the order as an administrator using the API with all three
 *    invalid IDs.
 * 4. Ensure the API call fails (validation or business logic enforcement). Use
 *    TestValidator.error to confirm error is thrown.
 * 5. Repeat the test with each single foreign key set to an invalid ID (one at a
 *    time), others set to random UUIDs, to check that each FK triggers an error
 *    independently.
 */
export async function test_api_aimall_backend_administrator_orders_test_admin_create_order_with_invalid_foreign_keys(
  connection: api.IConnection,
) {
  // 1. Prepare three guaranteed-fake UUIDs
  const badCustomerId = typia.random<string & tags.Format<"uuid">>();
  const badSellerId = typia.random<string & tags.Format<"uuid">>();
  const badAddressId = typia.random<string & tags.Format<"uuid">>();

  // 2. Compose base order body with all bad IDs and valid business fields
  const baseOrder = {
    customer_id: badCustomerId,
    seller_id: badSellerId,
    address_id: badAddressId,
    order_status: "pending",
    total_amount: 15000,
    currency: "KRW",
  } satisfies IAimallBackendOrder.ICreate;

  // 3. Try creating order with all invalid foreign keys
  await TestValidator.error("all foreign keys invalid should fail")(
    async () => {
      await api.functional.aimall_backend.administrator.orders.create(
        connection,
        { body: baseOrder },
      );
    },
  );

  // 4. Try with just customer_id invalid
  await TestValidator.error("customer_id invalid should fail")(async () => {
    await api.functional.aimall_backend.administrator.orders.create(
      connection,
      {
        body: {
          ...baseOrder,
          customer_id: badCustomerId,
          seller_id: typia.random<string & tags.Format<"uuid">>(),
          address_id: typia.random<string & tags.Format<"uuid">>(),
        },
      },
    );
  });

  // 5. Try with just seller_id invalid
  await TestValidator.error("seller_id invalid should fail")(async () => {
    await api.functional.aimall_backend.administrator.orders.create(
      connection,
      {
        body: {
          ...baseOrder,
          customer_id: typia.random<string & tags.Format<"uuid">>(),
          seller_id: badSellerId,
          address_id: typia.random<string & tags.Format<"uuid">>(),
        },
      },
    );
  });

  // 6. Try with just address_id invalid
  await TestValidator.error("address_id invalid should fail")(async () => {
    await api.functional.aimall_backend.administrator.orders.create(
      connection,
      {
        body: {
          ...baseOrder,
          customer_id: typia.random<string & tags.Format<"uuid">>(),
          seller_id: typia.random<string & tags.Format<"uuid">>(),
          address_id: badAddressId,
        },
      },
    );
  });
}
