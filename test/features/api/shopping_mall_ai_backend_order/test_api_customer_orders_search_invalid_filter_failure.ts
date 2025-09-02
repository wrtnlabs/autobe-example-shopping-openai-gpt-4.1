import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendOrder";
import type { IPageIShoppingMallAiBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendOrder";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validates input validation and error handling for order search (PATCH
 * /shoppingMallAiBackend/customer/orders) using invalid filters.
 *
 * 1. Register a new customer with random but valid details.
 * 2. Attempt to search for orders using a negative page number (invalid).
 *
 *    - The API should throw a validation or business logic error and not return
 *         actual results.
 * 3. Attempt to search for orders using a filter with a nonsensical status
 *    code (e.g., 'not_a_real_status').
 *
 *    - The API should throw a validation or business logic error and not return
 *         actual results.
 * 4. For both cases, assert that the API does not return any data and error
 *    handling is robust.
 */
export async function test_api_customer_orders_search_invalid_filter_failure(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new customer context
  const joinInput: IShoppingMallAiBackendCustomer.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    phone_number: RandomGenerator.mobile(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    nickname: RandomGenerator.name(1),
  };
  const auth: IShoppingMallAiBackendCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, { body: joinInput });
  typia.assert(auth);

  // 2. Attempt order search with negative page number
  await TestValidator.error(
    "order search rejects negative page number",
    async () => {
      await api.functional.shoppingMallAiBackend.customer.orders.index(
        connection,
        {
          body: {
            page: -1,
          } satisfies IShoppingMallAiBackendOrder.IRequest,
        },
      );
    },
  );

  // 3. Attempt order search with invalid status filter
  await TestValidator.error(
    "order search rejects invalid status value",
    async () => {
      await api.functional.shoppingMallAiBackend.customer.orders.index(
        connection,
        {
          body: {
            filter: {
              status: "not_a_real_status",
            },
          } satisfies IShoppingMallAiBackendOrder.IRequest,
        },
      );
    },
  );
}
