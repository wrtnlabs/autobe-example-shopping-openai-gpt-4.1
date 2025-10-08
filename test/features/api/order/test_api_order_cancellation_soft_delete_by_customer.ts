import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";

/**
 * Validate customer soft-delete of their own order cancellation request.
 *
 * 1. Register a new customer.
 * 2. Place a new order (assume a valid product and checkout process exists).
 * 3. Submit an order cancellation request (assume a valid endpoint).
 * 4. Soft-delete the cancellation request as the same customer, using the DELETE
 *    endpoint.
 * 5. Validate:
 *
 *    - The cancellation record now has a deleted_at timestamp set (not erased from
 *         storage).
 *    - It is invisible in user-facing APIs for cancellation requests but available
 *         via audit route (if exists).
 * 6. Edge Cases:
 *
 *    - Only the creator customer can soft-delete their own cancellation request (try
 *         another customer and expect error).
 *    - Finalized (approved/denied) cancellations cannot be soft-deleted.
 *    - (Assume necessary endpoints exist for order/cancellation
 *         creation/listing/inspection.)
 */
export async function test_api_order_cancellation_soft_delete_by_customer(
  connection: api.IConnection,
) {
  // Step 1: Register customer
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    address: {
      recipient_name: RandomGenerator.name(1),
      phone: RandomGenerator.mobile(),
      region: "Seoul",
      postal_code: "03187",
      address_line1: "123 Main St",
      address_line2: null,
      is_default: true,
    },
  } satisfies IShoppingMallCustomer.IJoin;
  const customer = await api.functional.auth.customer.join(connection, {
    body: joinBody,
  });
  typia.assert(customer);
  // ... (other steps would be here involving order placement and cancellation if their APIs existed)
  // Step N: Assume we have orderId and cancellationId after successful creation
  const orderId = typia.random<string & tags.Format<"uuid">>();
  const cancellationId = typia.random<string & tags.Format<"uuid">>();
  // Step 4: Soft-delete the cancellation as the authenticated customer
  await api.functional.shoppingMall.customer.orders.cancellations.erase(
    connection,
    {
      orderId,
      cancellationId,
    },
  );
  // Additional validations would check the cancellation's visibility/status/deleted_at via respective endpoints if available
  // Edge checks: try as another customer, try finalized case, expect business errors (not implemented here due to missing endpoints)
}
