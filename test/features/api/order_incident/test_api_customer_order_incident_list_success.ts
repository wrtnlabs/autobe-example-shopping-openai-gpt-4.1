import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IShoppingMallAiBackendOrderIncident } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendOrderIncident";
import type { IPageIShoppingMallAiBackendOrderIncident } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendOrderIncident";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function test_api_customer_order_incident_list_success(
  connection: api.IConnection,
) {
  /**
   * End-to-end test for verifying the customer order incident listing endpoint.
   *
   * This test covers registration and authentication workflows for both
   * customer and admin roles. It verifies that a customer can list order
   * incidents for an order ID using valid filtering and paging parameters as
   * per the endpoint contract. Since APIs for order creation and incident
   * creation are absent in the current context, the test uses randomly
   * generated UUIDs for the order ID and focuses on type contract validation,
   * authentication, access control basics, and response shape integrity.
   *
   * Steps:
   *
   * 1. Register a customer (join).
   * 2. Login as the newly registered customer.
   * 3. Register an admin account (join).
   * 4. Login as admin for required authentication context validation.
   * 5. Switch authentication back to the customer (re-login).
   * 6. List order incidents as the customer for a random order ID, with random
   *    filters and pagination set.
   * 7. Assert response types, contract, and that data is properly paginated with
   *    correct shapes.
   */

  // 1. Register customer
  const customerJoinInput: IShoppingMallAiBackendCustomer.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    phone_number: RandomGenerator.mobile(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    nickname: RandomGenerator.name(1),
  };
  const customerJoinResponse = await api.functional.auth.customer.join(
    connection,
    { body: customerJoinInput },
  );
  typia.assert(customerJoinResponse);

  // 2. Login as customer
  const customerLoginInput: IShoppingMallAiBackendCustomer.ILogin = {
    email: customerJoinInput.email,
    password: customerJoinInput.password,
  };
  const customerAuth = await api.functional.auth.customer.login(connection, {
    body: customerLoginInput,
  });
  typia.assert(customerAuth);

  // 3. Register admin
  const adminJoinInput: IShoppingMallAiBackendAdmin.ICreate = {
    username: RandomGenerator.name(1) + RandomGenerator.alphaNumeric(6),
    password_hash: RandomGenerator.alphaNumeric(32),
    name: RandomGenerator.name(),
    email: typia.random<string & tags.Format<"email">>(),
    is_active: true,
  };
  const adminJoinResponse = await api.functional.auth.admin.join(connection, {
    body: adminJoinInput,
  });
  typia.assert(adminJoinResponse);

  // 4. Login as admin
  const adminLoginInput: IShoppingMallAiBackendAdmin.ILogin = {
    username: adminJoinInput.username,
    password: RandomGenerator.alphaNumeric(12), // only a placeholder, as real pw hash is not set
  };
  // Using join-auth tokens as admin login is not feasibly testable due to missing hash routing, so just structure the call
  await api.functional.auth.admin.login(connection, { body: adminLoginInput });
  // Admin context injected: not used further due to lack of order/incident API contracts

  // 5. Switch back to customer context
  await api.functional.auth.customer.login(connection, {
    body: customerLoginInput,
  });

  // 6. PATCH /shoppingMallAiBackend/customer/orders/{orderId}/incidents - as customer
  const randomOrderId = typia.random<string & tags.Format<"uuid">>();
  const incidentRequest: IShoppingMallAiBackendOrderIncident.IRequest = {
    incident_type: RandomGenerator.pick([
      "fraud",
      "dispute",
      "compliance",
      "evidence",
      "error",
    ] as const),
    status: RandomGenerator.pick([
      "open",
      "closed",
      "resolved",
      "investigating",
      "reversed",
      "pending",
    ] as const),
    page: 1,
    limit: 10,
  };
  const incidentResponse =
    await api.functional.shoppingMallAiBackend.customer.orders.incidents.index(
      connection,
      {
        orderId: randomOrderId,
        body: incidentRequest,
      },
    );
  typia.assert(incidentResponse);

  // 7. Assert pagination shape integrity
  TestValidator.equals(
    "order incidents: pagination current page",
    incidentResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "order incidents: pagination limit",
    incidentResponse.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "order incidents: data is array",
    Array.isArray(incidentResponse.data),
  );
}
