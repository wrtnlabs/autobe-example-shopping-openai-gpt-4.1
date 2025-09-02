import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendOrderDeliveryEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendOrderDeliveryEvent";

export async function test_api_order_delivery_event_detail_admin_access_and_not_found(
  connection: api.IConnection,
) {
  /**
   * Validate admin-only access to view a specific delivery event's details by
   * eventId, deliveryId, and orderId.
   *
   * Steps:
   *
   * 1. Register a new admin to get authorized context.
   * 2. Generate valid random UUIDs (simulate existing order, delivery, event).
   * 3. As admin, retrieve delivery event details, asserting correct type and
   *    presence of all audit/business fields.
   * 4. Attempt retrieval with a fresh (non-existent) eventId, verify system
   *    returns error (not found/unauthorized).
   * 5. Attempt retrieval with no authentication, confirming that only admin
   *    authorization is accepted.
   */

  // 1. Register admin to obtain authentication/authorization
  const adminJoinInput: IShoppingMallAiBackendAdmin.ICreate = {
    username: RandomGenerator.alphaNumeric(10),
    password_hash: RandomGenerator.alphaNumeric(32),
    name: RandomGenerator.name(),
    email: typia.random<string & tags.Format<"email">>(),
    is_active: true,
    phone_number: RandomGenerator.mobile(),
  };
  const adminJoinOutput = await api.functional.auth.admin.join(connection, {
    body: adminJoinInput,
  });
  typia.assert(adminJoinOutput);

  // 2. Generate random (valid) UUIDs for order, delivery, and event
  const orderId = typia.random<string & tags.Format<"uuid">>();
  const deliveryId = typia.random<string & tags.Format<"uuid">>();
  const eventId = typia.random<string & tags.Format<"uuid">>();

  // 3. Successful: Retrieve event details as admin and assert critical audit/business fields are present
  const eventDetail =
    await api.functional.shoppingMallAiBackend.admin.orders.deliveries.events.at(
      connection,
      {
        orderId,
        deliveryId,
        eventId,
      },
    );
  typia.assert(eventDetail);
  TestValidator.predicate("event detail - id present", !!eventDetail.id);
  TestValidator.predicate(
    "event detail - correct parent delivery id",
    !!eventDetail.shopping_mall_ai_backend_order_delivery_id,
  );
  TestValidator.predicate(
    "event detail - event type present",
    !!eventDetail.event_type,
  );
  TestValidator.predicate(
    "event detail - logged_at present",
    !!eventDetail.logged_at,
  );
  TestValidator.predicate(
    "event detail - created_at present",
    !!eventDetail.created_at,
  );

  // 4. Negative: Retrieval of non-existent or unauthorized event returns error
  const nonExistentEventId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "retrieving non-existent delivery event should return error",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.orders.deliveries.events.at(
        connection,
        {
          orderId,
          deliveryId,
          eventId: nonExistentEventId,
        },
      );
    },
  );

  // 5. Negative: Access with no admin authentication is forbidden
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated access should be forbidden",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.orders.deliveries.events.at(
        unauthConn,
        {
          orderId,
          deliveryId,
          eventId,
        },
      );
    },
  );
}
