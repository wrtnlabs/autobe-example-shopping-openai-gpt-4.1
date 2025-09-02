import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IShoppingMallAiBackendCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomerSession";
import type { IPageIShoppingMallAiBackendCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendCustomerSession";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function test_api_admin_customer_session_pagination_and_filtering(
  connection: api.IConnection,
) {
  /**
   * Test the admin's ability to search and paginate customer sessions for audit
   * and support purposes.
   *
   * 1. Register an admin via /auth/admin/join to obtain sufficient authorization.
   * 2. Create a customer via /auth/customer/join, capturing their customer ID.
   * 3. Simulate multiple sessions for the customer by rejoining (repeat login),
   *    ensuring multiple session records to test pagination.
   * 4. As the admin, call
   *    /shoppingMallAiBackend/admin/customers/{customerId}/sessions with
   *    pagination params (limit=1, page=1 then page=2), verify correctness and
   *    field coverage.
   * 5. Attempt to access the session-listing API as the customer and as an
   *    unauthenticated connection, confirming proper permission denial and no
   *    information leakage.
   *
   * Business rules covered: Only authorized admins can list sessions;
   * pagination and session filtering works; non-admin/unauth access is properly
   * rejected.
   */

  // 1. Register an admin user
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminUsername = RandomGenerator.name(1);
  const adminPasswordHash = RandomGenerator.alphaNumeric(32);
  const adminName = RandomGenerator.name(2);
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      username: adminUsername,
      password_hash: adminPasswordHash,
      name: adminName,
      email: adminEmail,
      is_active: true,
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });
  typia.assert(admin);
  TestValidator.predicate(
    "admin join returns admin and access token",
    typeof admin.admin.id === "string" &&
      typeof admin.token.access === "string",
  );

  // 2. Register a customer
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPhone = RandomGenerator.mobile();
  const customerPassword = RandomGenerator.alphaNumeric(16);
  const customerName = RandomGenerator.name(2);
  const customerNickname = RandomGenerator.name(1);
  const customerAuth = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      phone_number: customerPhone,
      password: customerPassword,
      name: customerName,
      nickname: customerNickname,
    } satisfies IShoppingMallAiBackendCustomer.IJoin,
  });
  typia.assert(customerAuth);
  const customerId = typia.assert(customerAuth.customer.id);
  TestValidator.predicate(
    "customer join returns valid customer ID",
    typeof customerId === "string",
  );

  // 3. Simulate multiple sessions: repeat join for the customer
  const rejoin = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      phone_number: customerPhone,
      password: customerPassword,
      name: customerName,
      nickname: customerNickname,
    } satisfies IShoppingMallAiBackendCustomer.IJoin,
  });
  typia.assert(rejoin);
  TestValidator.notEquals(
    "each join produces a different token (unique session)",
    customerAuth.token.access,
    rejoin.token.access,
  );

  // 4. As admin, query first page of session listing
  const sessionsPage1 =
    await api.functional.shoppingMallAiBackend.admin.customers.sessions.index(
      connection,
      {
        customerId,
        body: {
          customer_id: customerId,
          page: 1,
          limit: 1,
        } satisfies IShoppingMallAiBackendCustomerSession.IRequest,
      },
    );
  typia.assert(sessionsPage1);
  TestValidator.predicate(
    "pagination records reflect multiple sessions",
    sessionsPage1.pagination.records >= 2,
  );
  TestValidator.equals(
    "first page contains exactly 1 session record",
    sessionsPage1.data.length,
    1,
  );
  const firstSession = sessionsPage1.data[0];
  typia.assert(firstSession);
  TestValidator.equals(
    "customer_id matches in session record",
    firstSession.customer_id,
    customerId,
  );
  TestValidator.predicate(
    "essential session fields exist",
    typeof firstSession.id === "string" &&
      typeof firstSession.access_token === "string" &&
      typeof firstSession.ip_address === "string",
  );

  // Query the second page
  const sessionsPage2 =
    await api.functional.shoppingMallAiBackend.admin.customers.sessions.index(
      connection,
      {
        customerId,
        body: {
          customer_id: customerId,
          page: 2,
          limit: 1,
        } satisfies IShoppingMallAiBackendCustomerSession.IRequest,
      },
    );
  typia.assert(sessionsPage2);
  TestValidator.equals(
    "second page contains 1 session",
    sessionsPage2.data.length,
    1,
  );
  TestValidator.notEquals(
    "page 1 and page 2 have different session records",
    sessionsPage1.data[0].id,
    sessionsPage2.data[0].id,
  );

  // 5. As the customer, attempt unauthorized access to admin session-list API
  await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      phone_number: customerPhone,
      password: customerPassword,
      name: customerName,
      nickname: customerNickname,
    } satisfies IShoppingMallAiBackendCustomer.IJoin,
  });

  await TestValidator.error(
    "customer is forbidden from accessing admin session listing",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.customers.sessions.index(
        connection,
        {
          customerId,
          body: {
            customer_id: customerId,
            page: 1,
            limit: 1,
          } satisfies IShoppingMallAiBackendCustomerSession.IRequest,
        },
      );
    },
  );

  // Test as unauthenticated connection (unset Authorization)
  const unauthConn = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated user cannot access session listing",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.customers.sessions.index(
        unauthConn,
        {
          customerId,
          body: {
            customer_id: customerId,
            page: 1,
            limit: 1,
          } satisfies IShoppingMallAiBackendCustomerSession.IRequest,
        },
      );
    },
  );
}
