import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendOrderDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendOrderDelivery";
import type { IPageIShoppingMallAiBackendOrderDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendOrderDelivery";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function test_api_order_deliveries_index_as_authenticated_customer(
  connection: api.IConnection,
) {
  /**
   * End-to-end test for paginated and filtered retrieval of order delivery
   * records as an authenticated customer. This test demonstrates customer
   * registration, authentication, and the ability to search for deliveries
   * belonging to an order using the
   * /shoppingMallAiBackend/customer/orders/{orderId}/deliveries endpoint.
   *
   * Basic test steps:
   *
   * 1. Register a new customer and automatically log in.
   * 2. Generate a mock orderId (random UUID) as no order creation API is
   *    available.
   * 3. Ensure the customer context is authenticated (Authorization header).
   * 4. Call the PATCH /shoppingMallAiBackend/customer/orders/{orderId}/deliveries
   *    endpoint using a random or valid orderId and random filters.
   * 5. Validate that the returned data structure is correct and pagination
   *    metadata is present.
   */
  // 1. Register and log in as customer
  const customerInput = {
    email: typia.random<string & tags.Format<"email">>(),
    phone_number: RandomGenerator.mobile(),
    password: "TestPassword123!@#", // strong test password
    name: RandomGenerator.name(),
    nickname: RandomGenerator.name(1),
  } satisfies IShoppingMallAiBackendCustomer.IJoin;
  const auth = await api.functional.auth.customer.join(connection, {
    body: customerInput,
  });
  typia.assert(auth);

  // 2. Prepare mock orderId (since order creation endpoint is not available in this scope)
  const orderId = typia.random<string & tags.Format<"uuid">>();

  // 3. Prepare random delivery filter/request (simulate a variety of queries)
  const deliveryRequest: IShoppingMallAiBackendOrderDelivery.IRequest = {
    deliveryStatus: RandomGenerator.pick([
      "ready",
      "in_progress",
      "complete",
      "failed",
      "returned",
    ] as const),
    provider: RandomGenerator.name(1),
    startDate: new Date(Date.now() - 60 * 60 * 24 * 1000 * 5).toISOString(), // from 5 days ago
    endDate: new Date().toISOString(),
    trackingNumber: RandomGenerator.alphaNumeric(10),
    page: 1,
    limit: 10,
    sortBy: RandomGenerator.pick([
      "created_at",
      "delivered_at",
      "delivery_status",
    ] as const),
    sortDirection: RandomGenerator.pick(["asc", "desc"] as const),
  };

  // 4. Call delivery index with the prepared request body
  const result =
    await api.functional.shoppingMallAiBackend.customer.orders.deliveries.index(
      connection,
      { orderId, body: deliveryRequest },
    );
  typia.assert(result);

  // 5. Runtime validation of page and data structure
  TestValidator.predicate(
    "pagination current page is 1",
    result.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is expected",
    result.pagination.limit === 10,
  );
  TestValidator.predicate(
    "pagination records is >= 0",
    result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is >= 0",
    result.pagination.pages >= 0,
  );

  // 6. For each delivery, check minimal structure match (id, status, etc)
  for (const delivery of result.data) {
    TestValidator.predicate(
      "delivery id exists",
      typeof delivery.id === "string" && delivery.id.length > 0,
    );
    TestValidator.predicate(
      "orderId relation correct",
      typeof delivery.shopping_mall_ai_backend_order_id === "string" &&
        delivery.shopping_mall_ai_backend_order_id.length > 0,
    );
    TestValidator.predicate(
      "delivery status present",
      typeof delivery.delivery_status === "string" &&
        delivery.delivery_status.length > 0,
    );
    TestValidator.predicate(
      "delivery creation date valid",
      typeof delivery.created_at === "string" && delivery.created_at.length > 0,
    );
    TestValidator.predicate(
      "delivery update date valid",
      typeof delivery.updated_at === "string" && delivery.updated_at.length > 0,
    );
  }
}
