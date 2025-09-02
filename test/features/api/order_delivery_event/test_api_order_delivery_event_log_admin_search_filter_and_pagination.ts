import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendOrderDeliveryEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendOrderDeliveryEvent";
import type { IPageIShoppingMallAiBackendOrderDeliveryEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendOrderDeliveryEvent";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function test_api_order_delivery_event_log_admin_search_filter_and_pagination(
  connection: api.IConnection,
) {
  /**
   * End-to-end test for admin delivery event log search and pagination.
   *
   * 1. Register and authenticate a new admin to gain access to the endpoint.
   * 2. Query the PATCH
   *    /shoppingMallAiBackend/admin/orders/{orderId}/deliveries/{deliveryId}/events
   *    endpoint for delivery events with a valid orderId/deliveryId and check
   *    that only records linked to that deliveryId are returned.
   * 3. Use a variety of filter and pagination parameters (eventType, date range,
   *    page, limit, sort fields), and validate evidence fields (event_type,
   *    logged_at, created_at) are present and filterable.
   * 4. Query again with a non-existent deliveryId to confirm the API responds with
   *    an error (not found or forbidden).
   * 5. Validate that unauthorized access (no admin role) is forbidden.
   */

  // 1. Register and authenticate a new admin for privileged context
  const adminCreate = {
    username: RandomGenerator.alphaNumeric(8),
    password_hash: RandomGenerator.alphaNumeric(32), // Backend handles hash; 32-char string
    name: RandomGenerator.name(),
    email: `${RandomGenerator.alphaNumeric(8)}@autobe.test.com`,
    is_active: true,
  } satisfies IShoppingMallAiBackendAdmin.ICreate;
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: adminCreate,
  });
  typia.assert(adminAuth);
  TestValidator.equals(
    "admin account is valid",
    adminAuth.admin.email,
    adminCreate.email,
  );

  // 2. Query the delivery event log endpoint with plausible IDs and default params
  const orderId = typia.random<string & tags.Format<"uuid">>();
  const deliveryId = typia.random<string & tags.Format<"uuid">>();
  const reqBody: IShoppingMallAiBackendOrderDeliveryEvent.IRequest = {};
  const basePage =
    await api.functional.shoppingMallAiBackend.admin.orders.deliveries.events.index(
      connection,
      {
        orderId,
        deliveryId,
        body: reqBody,
      },
    );
  typia.assert(basePage);
  // Validate all events, if any, match requested deliveryId
  basePage.data.forEach((event) =>
    TestValidator.equals(
      "event's delivery ID matches requested deliveryId",
      event.shopping_mall_ai_backend_order_delivery_id,
      deliveryId,
    ),
  );
  // Check that required evidence fields are non-empty
  basePage.data.forEach((event) => {
    TestValidator.predicate(
      "event_type should be non-empty",
      !!event.event_type && event.event_type.length > 0,
    );
    TestValidator.predicate(
      "logged_at should be non-empty",
      !!event.logged_at && event.logged_at.length > 0,
    );
  });

  // 3. Query with filters (eventType, date range, pagination, sorting)
  const filteredReq: IShoppingMallAiBackendOrderDeliveryEvent.IRequest = {
    eventType: RandomGenerator.alphabets(5),
    startDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(), // 30 days ago
    endDate: new Date().toISOString(),
    page: 1,
    limit: 2,
    sortBy: "logged_at",
    sortDirection: RandomGenerator.pick(["asc", "desc"] as const),
  };
  const filteredPage =
    await api.functional.shoppingMallAiBackend.admin.orders.deliveries.events.index(
      connection,
      {
        orderId,
        deliveryId,
        body: filteredReq,
      },
    );
  typia.assert(filteredPage);
  // Validate filtered pagination limit
  TestValidator.predicate(
    "filtered pagination has expected limit",
    filteredPage.pagination.limit <= 2,
  );
  // All results match deliveryId
  filteredPage.data.forEach((event) =>
    TestValidator.equals(
      "filtered event's delivery ID matches requested deliveryId",
      event.shopping_mall_ai_backend_order_delivery_id,
      deliveryId,
    ),
  );
  // Validate evidence fields are non-empty
  filteredPage.data.forEach((event) =>
    TestValidator.predicate(
      "filtered event has event_type",
      !!event.event_type,
    ),
  );

  // 4. Query with a non-existent deliveryId (should fail/not found)
  const nonExistentDeliveryId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "Query with non-existent deliveryId fails",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.orders.deliveries.events.index(
        connection,
        {
          orderId,
          deliveryId: nonExistentDeliveryId,
          body: {},
        },
      );
    },
  );

  // 5. Role-based access: test without admin auth (forbidden)
  const unauthConnection: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("forbidden for non-admin roles", async () => {
    await api.functional.shoppingMallAiBackend.admin.orders.deliveries.events.index(
      unauthConnection,
      {
        orderId,
        deliveryId,
        body: {},
      },
    );
  });
}
