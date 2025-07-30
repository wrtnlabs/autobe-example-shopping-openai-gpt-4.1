import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrder";

/**
 * Validate that unauthenticated order creation is denied.
 *
 * Attempts to submit a new order (POST /aimall-backend/customer/orders) without
 * any authentication context. This test ensures that the system strictly
 * enforces authentication for order creation, and does not allow guests,
 * anonymous, or unauthenticated users to create orders. According to the
 * business requirement and security context, only valid customers, sellers, or
 * administrators should be able to place orders. Any attempt by an
 * unauthenticated client must be rejected by the API with an appropriate
 * authorization error (such as 401 Unauthorized).
 *
 * Steps:
 *
 * 1. Prepare a connection object with no authentication headers (simulate
 *    logged-out state).
 * 2. Build a random but valid IAimallBackendOrder.ICreate DTO.
 * 3. Attempt to create an order using the unauthenticated connection.
 * 4. Expect the API to reject the request with an authorization error. Test passes
 *    if the error is thrown, fails otherwise.
 */
export async function test_api_aimall_backend_customer_orders_test_create_order_unauthenticated_access_denied(
  connection: api.IConnection,
) {
  // 1. Prepare a random, valid order payload (fields are all required except order_number, which is optional)
  const dto: IAimallBackendOrder.ICreate = {
    customer_id: typia.random<string & tags.Format<"uuid">>(),
    seller_id: typia.random<string & tags.Format<"uuid">>(),
    address_id: typia.random<string & tags.Format<"uuid">>(),
    order_status: "pending",
    total_amount: typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<1000000>
    >(),
    currency: "KRW",
    // order_number is left out to trigger system auto-generation as per API description
  };

  // 2. Create an unauthenticated connection (clone connection, remove headers)
  const unauthConnection = { ...connection, headers: {} };

  // 3. Attempt the request and assert that an error (authentication error) is thrown
  await TestValidator.error("unauthenticated order creation must be denied")(
    async () => {
      await api.functional.aimall_backend.customer.orders.create(
        unauthConnection,
        {
          body: dto,
        },
      );
    },
  );
}
