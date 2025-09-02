import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IShoppingMallAiBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendOrder";
import type { IShoppingMallAiBackendOrderRefund } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendOrderRefund";
import type { EOrderRefundStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/EOrderRefundStatus";
import type { IPageIShoppingMallAiBackendOrderRefund } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendOrderRefund";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function test_api_order_refund_admin_list_success_with_various_filters(
  connection: api.IConnection,
) {
  /**
   * Validate the admin refund search endpoint for an order with various filter,
   * pagination, and access scenarios.
   *
   * This test covers:
   *
   * - Creating accounts and switching authentication contexts correctly (admin vs
   *   customer)
   * - Creating an order as customer
   * - Listing/creating (where possible) refund records associated with the order,
   *   for search diversity
   * - Using the admin refund search endpoint with various filters (status,
   *   page/limit)
   * - Validating success conditions (filtered refund matches, pagination) and
   *   error scenarios (bad order ID, forbidden, invalid filter)
   */

  // 1. Admin account setup and authentication
  const adminUsername = RandomGenerator.alphabets(10);
  const adminEmail = `${RandomGenerator.alphabets(10)}@mall.com`;
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      username: adminUsername,
      password_hash: adminPassword, // For E2E test purposes, use raw password as hash
      name: RandomGenerator.name(2),
      email: adminEmail as string & tags.Format<"email">,
      phone_number: RandomGenerator.mobile(),
      is_active: true,
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });
  typia.assert(adminJoin);

  // 2. Customer account registration
  const customerEmail = `${RandomGenerator.alphabets(10)}@test.com`;
  const customerPassword = RandomGenerator.alphaNumeric(10) as string &
    tags.Format<"password">;
  const customerJoin = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail as string & tags.Format<"email">,
      phone_number: RandomGenerator.mobile(),
      password: customerPassword,
      name: RandomGenerator.name(2),
      nickname: RandomGenerator.name(1),
    } satisfies IShoppingMallAiBackendCustomer.IJoin,
  });
  typia.assert(customerJoin);

  // 3. Customer login and context switch
  const customerLogin = await api.functional.auth.customer.login(connection, {
    body: {
      email: customerEmail as string & tags.Format<"email">,
      password: customerPassword,
    } satisfies IShoppingMallAiBackendCustomer.ILogin,
  });
  typia.assert(customerLogin);
  const customerId = customerLogin.customer.id;

  // 4. Customer creates an order
  const order =
    await api.functional.shoppingMallAiBackend.customer.orders.create(
      connection,
      {
        body: {
          shopping_mall_ai_backend_customer_id: customerId,
          shopping_mall_ai_backend_channel_id: typia.random<
            string & tags.Format<"uuid">
          >(),
          code: RandomGenerator.alphaNumeric(8),
          status: "pending",
          total_amount: 10000,
          currency: "KRW",
          ordered_at: new Date().toISOString() as string &
            tags.Format<"date-time">,
        } satisfies IShoppingMallAiBackendOrder.ICreate,
      },
    );
  typia.assert(order);
  const orderId = order.id;

  // 5. Create/search refunds (simulate diversity in status, for index tests)
  const refundStatuses: EOrderRefundStatus[] = [
    "requested",
    "approved",
    "completed",
  ];
  const createdRefunds: IShoppingMallAiBackendOrderRefund[] = [];
  for (let i = 0; i < refundStatuses.length; ++i) {
    const refundPage =
      await api.functional.shoppingMallAiBackend.customer.orders.refunds.index(
        connection,
        {
          orderId: orderId,
          body: {
            status: refundStatuses[i],
            page: 1,
            limit: 1,
          } satisfies IShoppingMallAiBackendOrderRefund.IRequest,
        },
      );
    typia.assert(refundPage);
    if (refundPage.data.length > 0) createdRefunds.push(refundPage.data[0]);
  }

  // 6. Admin login to test admin endpoint (context switch)
  await api.functional.auth.admin.login(connection, {
    body: {
      username: adminUsername,
      password: adminPassword,
    } satisfies IShoppingMallAiBackendAdmin.ILogin,
  });

  // 7. Admin refund search by status and correctness validation
  for (const status of refundStatuses) {
    const adminView =
      await api.functional.shoppingMallAiBackend.admin.orders.refunds.index(
        connection,
        {
          orderId: orderId,
          body: {
            status: status,
            page: 1,
            limit: 10,
          } satisfies IShoppingMallAiBackendOrderRefund.IRequest,
        },
      );
    typia.assert(adminView);
    TestValidator.predicate(
      `admin refund search by status '${status}' returns only matching refunds`,
      adminView.data.every((r) => r.status === status),
    );
    TestValidator.equals(
      `admin refund search total matches filter for status '${status}'`,
      adminView.data.length,
      createdRefunds.filter((r) => r.status === status).length,
    );
  }

  // 8. Pagination check with limit = 1
  const paginated =
    await api.functional.shoppingMallAiBackend.admin.orders.refunds.index(
      connection,
      {
        orderId: orderId,
        body: {
          page: 1,
          limit: 1,
        } satisfies IShoppingMallAiBackendOrderRefund.IRequest,
      },
    );
  typia.assert(paginated);
  TestValidator.equals("pagination page size == 1", paginated.data.length, 1);

  // 9. Error: invalid orderId (admin role)
  await TestValidator.error(
    "admin refund search with invalid orderId fails",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.orders.refunds.index(
        connection,
        {
          orderId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            page: 1,
            limit: 10,
          } satisfies IShoppingMallAiBackendOrderRefund.IRequest,
        },
      );
    },
  );

  // 10. Error: insufficient privileges (as customer)
  await api.functional.auth.customer.login(connection, {
    body: {
      email: customerEmail as string & tags.Format<"email">,
      password: customerPassword,
    } satisfies IShoppingMallAiBackendCustomer.ILogin,
  });
  await TestValidator.error(
    "refund list as customer (should fail)",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.orders.refunds.index(
        connection,
        {
          orderId: orderId,
          body: {
            page: 1,
            limit: 10,
          } satisfies IShoppingMallAiBackendOrderRefund.IRequest,
        },
      );
    },
  );

  // 11. Error: malformed filter parameters (negative page/limit)
  await api.functional.auth.admin.login(connection, {
    body: {
      username: adminUsername,
      password: adminPassword,
    } satisfies IShoppingMallAiBackendAdmin.ILogin,
  });
  await TestValidator.error(
    "refund list with malformed params should fail",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.orders.refunds.index(
        connection,
        {
          orderId: orderId,
          body: {
            page: -1,
            limit: -5,
          } satisfies IShoppingMallAiBackendOrderRefund.IRequest,
        },
      );
    },
  );
}
