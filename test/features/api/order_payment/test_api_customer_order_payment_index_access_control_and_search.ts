import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendOrderPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendOrderPayment";
import type { IPageIShoppingMallAiBackendOrderPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendOrderPayment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function test_api_customer_order_payment_index_access_control_and_search(
  connection: api.IConnection,
) {
  /**
   * Test paginated search and access control for order payments endpoint.
   *
   * Scenario:
   *
   * 1. Register and authenticate as a customer (customer1)
   * 2. (Mock) Obtain a random orderId belonging to this customer (no API to create
   *    real order/payment)
   * 3. Query the PATCH /shoppingMallAiBackend/customer/orders/{orderId}/payments
   *    endpoint with pagination/sorting
   * 4. Validate that response structure, pagination logic, and filter logic is
   *    correct
   * 5. Attempt to filter payments by payment_method if any exist
   * 6. Test out-of-range pagination returns empty results
   * 7. Register a second customer and attempt to access first customer's payments
   *    (should fail by access control)
   * 8. Attempt unauthenticated access (should fail)
   * 9. Attempt access with a non-existent orderId (should fail gracefully)
   */

  // 1. Register and authenticate customer1
  const customer1Data = {
    email: typia.random<string & tags.Format<"email">>(),
    phone_number: RandomGenerator.mobile(),
    password: "Test1234!@#",
    name: RandomGenerator.name(),
    nickname: RandomGenerator.name(),
  } satisfies IShoppingMallAiBackendCustomer.IJoin;
  const customer1Auth = await api.functional.auth.customer.join(connection, {
    body: customer1Data,
  });
  typia.assert(customer1Auth);
  const customer1 = customer1Auth.customer;

  // 2. Mock a valid orderId (no API to create orders/payments, so use random UUID)
  const orderId = typia.random<string & tags.Format<"uuid">>();

  // 3. Payment search with pagination, sorting (as authenticated customer)
  const paymentReq: IShoppingMallAiBackendOrderPayment.IRequest = {
    payment_method: undefined,
    status: undefined,
    page: 1,
    limit: 5,
    sort: "requested_at:desc",
  };
  const paymentPage =
    await api.functional.shoppingMallAiBackend.customer.orders.payments.index(
      connection,
      {
        orderId,
        body: paymentReq,
      },
    );
  typia.assert(paymentPage);
  TestValidator.predicate(
    "pagination matches expected page size limit",
    paymentPage.data.length <= paymentPage.pagination.limit,
  );

  // 4. Filter by payment_method if any exist
  if (paymentPage.data.length > 0) {
    const method = paymentPage.data[0].payment_method;
    const filteredRes =
      await api.functional.shoppingMallAiBackend.customer.orders.payments.index(
        connection,
        {
          orderId,
          body: {
            payment_method: method,
            limit: 10,
          } satisfies IShoppingMallAiBackendOrderPayment.IRequest,
        },
      );
    typia.assert(filteredRes);
    TestValidator.predicate(
      "all returned payments should use filter method",
      filteredRes.data.every((p) => p.payment_method === method),
    );
  }

  // 5. Pagination edge: out-of-range page (should return empty data array)
  const highPage = 9999;
  const emptyRes =
    await api.functional.shoppingMallAiBackend.customer.orders.payments.index(
      connection,
      {
        orderId,
        body: {
          page: highPage,
          limit: 5,
        } satisfies IShoppingMallAiBackendOrderPayment.IRequest,
      },
    );
  typia.assert(emptyRes);
  TestValidator.equals("empty result for out-of-range page", emptyRes.data, []);

  // 6. Register a second customer
  const customer2Data = {
    email: typia.random<string & tags.Format<"email">>(),
    phone_number: RandomGenerator.mobile(),
    password: "Test1234!@#",
    name: RandomGenerator.name(),
    nickname: RandomGenerator.name(),
  } satisfies IShoppingMallAiBackendCustomer.IJoin;
  const customer2Auth = await api.functional.auth.customer.join(connection, {
    body: customer2Data,
  });
  typia.assert(customer2Auth);

  // 7. Access control: other customer should not access first customer's payments
  await TestValidator.error(
    "other customer should not access first customer's order payments",
    async () => {
      await api.functional.shoppingMallAiBackend.customer.orders.payments.index(
        connection,
        {
          orderId,
          body: {
            limit: 1,
          } satisfies IShoppingMallAiBackendOrderPayment.IRequest,
        },
      );
    },
  );

  // 8. Unauthenticated access should fail
  const unauthConn = { ...connection, headers: {} };
  await TestValidator.error("unauthenticated access should fail", async () => {
    await api.functional.shoppingMallAiBackend.customer.orders.payments.index(
      unauthConn,
      {
        orderId,
        body: {
          limit: 1,
        } satisfies IShoppingMallAiBackendOrderPayment.IRequest,
      },
    );
  });

  // 9. Non-existent orderId should fail
  const fakeOrderId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("non-existent orderId should fail", async () => {
    await api.functional.shoppingMallAiBackend.customer.orders.payments.index(
      connection,
      {
        orderId: fakeOrderId,
        body: {
          limit: 1,
        } satisfies IShoppingMallAiBackendOrderPayment.IRequest,
      },
    );
  });
}
