import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendOrderIncident } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendOrderIncident";
import type { IPageIShoppingMallAiBackendOrderIncident } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendOrderIncident";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validate that incidents listing for a customer order is strictly
 * forbidden for unauthenticated and invalidly authenticated users.
 *
 * 1. Register a customer using join endpoint so that we have a valid
 *    'customer' context (and, in a full system, referenced orders).
 * 2. Attempt to list order incidents on a fake/random order UUID using the
 *    incidents listing endpoint **without any Authorization header**.
 *
 *    - Expect this to be denied with an authentication/authorization error (401
 *         or 403).
 * 3. Attempt again to list order incidents with a clearly invalid/fake
 *    Authorization token.
 *
 *    - Expect this also to be denied with an authentication/authorization error.
 * 4. These checks ensure NO unauthorized access to any order incident list is
 *    possible, regardless of path/order id.
 */
export async function test_api_customer_order_incident_list_unauthorized_access(
  connection: api.IConnection,
) {
  // 1. Register a customer (auth setup prerequisite)
  const customerJoinInput: IShoppingMallAiBackendCustomer.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    phone_number: RandomGenerator.mobile(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    nickname: RandomGenerator.name(1),
  };
  const customerAuth = await api.functional.auth.customer.join(connection, {
    body: customerJoinInput,
  });
  typia.assert(customerAuth);

  // Prepare a fake (random) orderId for incident listing trial
  const orderId = typia.random<string & tags.Format<"uuid">>();
  const body: IShoppingMallAiBackendOrderIncident.IRequest = {};

  // 2. Try listing incidents as *unauthenticated* (no Authorization header at all)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "incident list forbidden for unauthenticated user",
    async () => {
      await api.functional.shoppingMallAiBackend.customer.orders.incidents.index(
        unauthConn,
        { orderId, body },
      );
    },
  );

  // 3. Try listing incidents as *invalidly authenticated* (bad Authorization token supplied)
  const badTokenConn: api.IConnection = {
    ...connection,
    headers: { Authorization: "Bearer FAKE_TOKEN_123" },
  };
  await TestValidator.error(
    "incident list forbidden with invalid auth token",
    async () => {
      await api.functional.shoppingMallAiBackend.customer.orders.incidents.index(
        badTokenConn,
        { orderId, body },
      );
    },
  );
}
