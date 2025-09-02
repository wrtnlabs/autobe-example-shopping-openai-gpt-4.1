import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendOrderExchange } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendOrderExchange";

export async function test_api_order_exchange_customer_detail_access(
  connection: api.IConnection,
) {
  /**
   * Test that an authenticated customer can retrieve the details of an exchange
   * for one of their orders.
   *
   * This function validates that a logged-in customer can access the detail of
   * an order exchange that is supposed to belong to them. Because there are no
   * APIs for order placement or exchange creation in the provided SDK/types,
   * the test cannot cover the full creation-to-detail workflow, and instead
   * validates the proper handling of authenticated detail GET for a (simulated)
   * own exchange.
   *
   * Steps:
   *
   * 1. Register a customer to establish authentication context.
   * 2. Simulate a valid orderId and exchangeId (real creation cannot be performed
   *    here).
   * 3. Call GET
   *    /shoppingMallAiBackend/customer/orders/{orderId}/exchanges/{exchangeId}
   *    as the authenticated customer.
   * 4. Assert the returned object contains all business-relevant fields (IDs,
   *    status, reason, date/times) in the expected format and type, and that
   *    access works for the owning customer.
   * 5. (Checks for unauthenticated or other-customer access are omitted because
   *    insufficient APIs are available for such flows.)
   */

  // 1. Register & authenticate customer
  const joinOut = await api.functional.auth.customer.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      phone_number: RandomGenerator.mobile(),
      password: RandomGenerator.alphaNumeric(12),
      name: RandomGenerator.name(),
      nickname: RandomGenerator.name(1),
    } satisfies IShoppingMallAiBackendCustomer.IJoin,
  });
  typia.assert(joinOut);

  // 2. Simulate valid UUIDs for order/exchange: In a real test, these would come from preceding steps.
  const orderId = typia.random<string & tags.Format<"uuid">>();
  const exchangeId = typia.random<string & tags.Format<"uuid">>();

  // 3. Fetch exchange detail for this customer's order/exchange
  const exchange =
    await api.functional.shoppingMallAiBackend.customer.orders.exchanges.at(
      connection,
      { orderId, exchangeId },
    );
  typia.assert(exchange);

  // 4. Business and structure validation
  const uuidPattern = /^[0-9a-fA-F-]{36}$/;
  TestValidator.predicate(
    "Exchange ID is valid UUID",
    typeof exchange.id === "string" && uuidPattern.test(exchange.id),
  );
  TestValidator.predicate(
    "Order ID is valid UUID",
    typeof exchange.shopping_mall_ai_backend_order_id === "string" &&
      uuidPattern.test(exchange.shopping_mall_ai_backend_order_id),
  );
  TestValidator.predicate(
    "Order item ID is valid UUID",
    typeof exchange.shopping_mall_ai_backend_order_item_id === "string" &&
      uuidPattern.test(exchange.shopping_mall_ai_backend_order_item_id),
  );
  TestValidator.predicate(
    "Exchange reason is present",
    typeof exchange.exchange_reason === "string" &&
      exchange.exchange_reason.length > 0,
  );
  TestValidator.predicate(
    "Exchange status is present",
    typeof exchange.status === "string" && exchange.status.length > 0,
  );
  TestValidator.predicate(
    "Requested at is valid date-time",
    typeof exchange.requested_at === "string" &&
      !isNaN(Date.parse(exchange.requested_at)),
  );
  TestValidator.predicate(
    "Created at is valid date-time",
    typeof exchange.created_at === "string" &&
      !isNaN(Date.parse(exchange.created_at)),
  );
  TestValidator.predicate(
    "Updated at is valid date-time",
    typeof exchange.updated_at === "string" &&
      !isNaN(Date.parse(exchange.updated_at)),
  );
  TestValidator.predicate(
    "Processed at is null or valid date-time",
    exchange.processed_at === null ||
      exchange.processed_at === undefined ||
      (typeof exchange.processed_at === "string" &&
        !isNaN(Date.parse(exchange.processed_at))),
  );
  TestValidator.predicate(
    "Completed at is null or valid date-time",
    exchange.completed_at === null ||
      exchange.completed_at === undefined ||
      (typeof exchange.completed_at === "string" &&
        !isNaN(Date.parse(exchange.completed_at))),
  );
  TestValidator.predicate(
    "Deleted at is null or valid date-time",
    exchange.deleted_at === null ||
      exchange.deleted_at === undefined ||
      (typeof exchange.deleted_at === "string" &&
        !isNaN(Date.parse(exchange.deleted_at))),
  );
}
