import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendOrderRefund } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendOrderRefund";
import type { EOrderRefundStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/EOrderRefundStatus";
import type { IPageIShoppingMallAiBackendOrderRefund } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendOrderRefund";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function test_api_order_refund_list_customer_success(
  connection: api.IConnection,
) {
  /**
   * Validates successful customer-side search and paginated listing of refunds
   * for a specific order.
   *
   * Steps:
   *
   * 1. Register as a customer to obtain authentication context using
   *    /auth/customer/join.
   * 2. (Omitted: Order and refund resource creation, per scenario limitations)
   * 3. Use PATCH /shoppingMallAiBackend/customer/orders/{orderId}/refunds to list
   *    refunds for a (simulated) order, with paginated and filtered
   *    parameters.
   * 4. Assert that results only include refunds for the current customer and test
   *    order ID, checking pagination and summary correctness.
   * 5. Try invalid filter parameters (such as bogus status or non-integer
   *    pagination), asserting the API returns errors as expected.
   */
  // 1. Register and authenticate customer
  const customerJoinInput: IShoppingMallAiBackendCustomer.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    phone_number: RandomGenerator.mobile(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    nickname: RandomGenerator.name(1),
  };
  const authorized = await api.functional.auth.customer.join(connection, {
    body: customerJoinInput,
  });
  typia.assert(authorized);
  TestValidator.equals(
    "Newly joined customer email matches input",
    authorized.customer.email,
    customerJoinInput.email,
  );

  // 2. (Resource setup for orders/refunds omitted as endpoints are not available in this context)
  // Assume there is at least one valid order ID for this test; simulate with random UUID
  const testOrderId = typia.random<string & tags.Format<"uuid">>();

  // 3. List refunds for order: page 1, limit 5, no status filter
  const pageRequest: IShoppingMallAiBackendOrderRefund.IRequest = {
    page: 1,
    limit: 5,
  };
  const refundList =
    await api.functional.shoppingMallAiBackend.customer.orders.refunds.index(
      connection,
      {
        orderId: testOrderId,
        body: pageRequest,
      },
    );
  typia.assert(refundList);
  TestValidator.predicate(
    "Refund page includes pagination and data",
    refundList.pagination !== undefined && refundList.data !== undefined,
  );
  TestValidator.equals(
    "Refund page current page is 1",
    refundList.pagination.current,
    1,
  );
  TestValidator.equals(
    "Refund page limit is 5",
    refundList.pagination.limit,
    5,
  );

  // Refund entries should match testOrderId and have correct data types
  for (const refund of refundList.data) {
    TestValidator.equals(
      "Refund order ID matches testOrderId",
      refund.shopping_mall_ai_backend_order_id,
      testOrderId,
    );
    TestValidator.predicate(
      "Refund status is a non-empty string",
      typeof refund.status === "string" && !!refund.status,
    );
    TestValidator.predicate(
      "Refund amount is a non-negative number",
      typeof refund.amount === "number" && refund.amount >= 0,
    );
  }

  // 4. Test each filterable status value
  const refundStatuses: EOrderRefundStatus[] = [
    "requested",
    "approved",
    "rejected",
    "processing",
    "paid",
    "completed",
  ];
  for (const status of refundStatuses) {
    const filtered =
      await api.functional.shoppingMallAiBackend.customer.orders.refunds.index(
        connection,
        {
          orderId: testOrderId,
          body: { ...pageRequest, status },
        },
      );
    typia.assert(filtered);
    for (const refund of filtered.data) {
      TestValidator.equals(
        `Refund status matches filter '${status}'`,
        refund.status,
        status,
      );
    }
  }

  // 5. Error on invalid status value
  await TestValidator.error(
    "Unrecognized status value triggers validation error",
    async () => {
      await api.functional.shoppingMallAiBackend.customer.orders.refunds.index(
        connection,
        {
          orderId: testOrderId,
          body: { ...pageRequest, status: "notastatus" as any },
        },
      );
    },
  );

  // 6. Error on non-integer 'page' value
  await TestValidator.error(
    "Non-integer page triggers validation error",
    async () => {
      await api.functional.shoppingMallAiBackend.customer.orders.refunds.index(
        connection,
        {
          orderId: testOrderId,
          body: { ...pageRequest, page: "foo" as any },
        },
      );
    },
  );
}
