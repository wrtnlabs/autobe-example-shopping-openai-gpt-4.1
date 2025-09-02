import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function test_api_order_exchange_delete_customer_success(
  connection: api.IConnection,
) {
  /**
   * Test a customer successfully soft-deleting one of their own order item
   * exchanges.
   *
   * 1. Register a test customer to obtain authentication context.
   * 2. Generate simulated UUIDs for order and exchange (acting as stand-ins for
   *    created test data; creation not implemented due to unavailable
   *    endpoints).
   * 3. Perform a DELETE request to the exchange erase endpoint as the
   *    authenticated customer using the simulated IDs.
   * 4. Confirm that the response is void. No further post-deletion status checks
   *    are possible since read/list APIs are not present.
   */

  // 1. Register test customer for authentication context
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    phone_number: RandomGenerator.mobile(),
    password: typia.random<string & tags.Format<"password">>(),
    name: RandomGenerator.name(),
    nickname: RandomGenerator.name(1),
  } satisfies IShoppingMallAiBackendCustomer.IJoin;
  const joinOutput: IShoppingMallAiBackendCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: joinInput,
    });
  typia.assert(joinOutput);

  // 2. Simulate order/exchange IDs due to unavailable creation endpoints
  const orderId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const exchangeId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Perform the soft-delete request as the authenticated customer
  const output =
    await api.functional.shoppingMallAiBackend.customer.orders.exchanges.erase(
      connection,
      {
        orderId,
        exchangeId,
      },
    );

  // 4. Confirm a void response as expected (true erase semantics)
  TestValidator.equals("erase endpoint should return void", output, undefined);
}
