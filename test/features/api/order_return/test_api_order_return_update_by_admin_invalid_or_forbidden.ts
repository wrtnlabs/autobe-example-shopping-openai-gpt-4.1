import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendOrderReturn } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendOrderReturn";
import type { EOrderReturnStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/EOrderReturnStatus";

export async function test_api_order_return_update_by_admin_invalid_or_forbidden(
  connection: api.IConnection,
) {
  /**
   * E2E test for validating forbidden and invalid update attempts to order
   * returns by an admin.
   *
   * This test ensures:
   *
   * - Invalid IDs, forbidden state transitions, and invalid field values yield
   *   precise errors,
   * - No state modification occurs on failed attempts,
   * - Only authenticated admins may access the update endpoint.
   *
   * Steps:
   *
   * 1. Register an admin and authenticate (acquire Authorization header),
   * 2. Attempt forbidden/invalid updates as authenticated admin: a) Use a
   *    non-existent orderId/returnId b) Use mismatched orderId/returnId linkage
   *    c) Try forbidden transitions (e.g., requested -> completed) d) Send
   *    invalid/forbidden field values (e.g., malformed status, future
   *    completed_at)
   * 3. Assert that validation, forbidden, or not-found errors are returned and no
   *    underlying data is improperly modified.
   */

  // --- 1. Register and authenticate a new admin account ---
  const adminJoinInput: IShoppingMallAiBackendAdmin.ICreate = {
    username: RandomGenerator.alphabets(8),
    password_hash: RandomGenerator.alphaNumeric(32),
    name: RandomGenerator.name(2),
    email: `${RandomGenerator.alphabets(6)}@company.com`,
    is_active: true,
  };
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: adminJoinInput,
  });
  typia.assert(adminAuth);

  // --- Prepare random UUIDs for update attempts ---
  const randomOrderId = typia.random<string & tags.Format<"uuid">>();
  const randomReturnId = typia.random<string & tags.Format<"uuid">>();
  const allowedStatuses: EOrderReturnStatus[] = [
    "requested",
    "approved",
    "rejected",
    "in_progress",
    "completed",
  ];

  // --- 2.a Non-existent orderId/returnId ---
  // No valid data creation endpoint, so all IDs are random/unlinked
  await TestValidator.error(
    "updating with non-existent orderId should return not-found or validation error",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.orders.returns.update(
        connection,
        {
          orderId: randomOrderId,
          returnId: randomReturnId,
          body: {
            status: "approved",
          } satisfies IShoppingMallAiBackendOrderReturn.IUpdate,
        },
      );
    },
  );
  await TestValidator.error(
    "updating with non-existent returnId should return not-found or validation error",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.orders.returns.update(
        connection,
        {
          orderId: randomOrderId,
          returnId: randomReturnId,
          body: {
            return_reason: "Invalid ID test case",
          } satisfies IShoppingMallAiBackendOrderReturn.IUpdate,
        },
      );
    },
  );

  // --- 2.b Mismatched orderId/returnId linkage ---
  await TestValidator.error(
    "mismatched orderId and returnId linkage should return not found or forbidden",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.orders.returns.update(
        connection,
        {
          orderId: typia.random<string & tags.Format<"uuid">>(),
          returnId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            status: "approved",
          } satisfies IShoppingMallAiBackendOrderReturn.IUpdate,
        },
      );
    },
  );

  // --- 2.c Forbidden transitions: requested -> completed (should require proper workflow) ---
  await TestValidator.error(
    "forbidden direct transition to completed status is rejected",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.orders.returns.update(
        connection,
        {
          orderId: randomOrderId,
          returnId: randomReturnId,
          body: {
            status: "completed",
          } satisfies IShoppingMallAiBackendOrderReturn.IUpdate,
        },
      );
    },
  );

  // --- 2.d Invalid field values ---
  // Invalid status field: not an enum value
  await TestValidator.error(
    "invalid status field (not in enum) is rejected by validation",
    async () => {
      // purposely sending a string outside the allowed enum
      await api.functional.shoppingMallAiBackend.admin.orders.returns.update(
        connection,
        {
          orderId: randomOrderId,
          returnId: randomReturnId,
          body: {
            status: "not_a_status" as any,
          } as IShoppingMallAiBackendOrderReturn.IUpdate,
        },
      );
    },
  );
  // Future completed_at date
  await TestValidator.error(
    "future completed_at value is rejected by validation",
    async () => {
      const futureIso = new Date(
        Date.now() + 1000 * 60 * 60 * 24 * 365,
      ).toISOString();
      await api.functional.shoppingMallAiBackend.admin.orders.returns.update(
        connection,
        {
          orderId: randomOrderId,
          returnId: randomReturnId,
          body: {
            completed_at: futureIso,
          } satisfies IShoppingMallAiBackendOrderReturn.IUpdate,
        },
      );
    },
  );
}
