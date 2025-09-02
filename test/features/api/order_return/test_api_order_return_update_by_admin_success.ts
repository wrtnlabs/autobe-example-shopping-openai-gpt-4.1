import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendOrderReturn } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendOrderReturn";
import type { EOrderReturnStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/EOrderReturnStatus";

/**
 * Test that an authenticated admin can update the details of an order item
 * return request.
 *
 * This verifies that the admin can transition status (using the
 * EOrderReturnStatus enum), edit the return reason, and assign/clear the
 * completion date for an existing return request. The operation should be
 * successful only when performed by an authenticated admin and with valid
 * values per business logic.
 *
 * Steps:
 *
 * 1. Register a new admin via the join API and authenticate admin (credentials
 *    are random for test isolation).
 * 2. Assume a valid order return exists (simulate with random UUIDs for
 *    orderId and returnId).
 * 3. Prepare a valid update payload, e.g.:
 *
 *    - Status: pick a valid transition value from EOrderReturnStatus
 *    - Return_reason: use a realistic random string
 *    - Completed_at: provide a plausible date-time string (ISO8601) or null
 * 4. Perform the update call as an authenticated admin.
 * 5. Assert the response is a valid IShoppingMallAiBackendOrderReturn and all
 *    provided fields match.
 * 6. Assert that the updated entity's updated_at reflects the change and is a
 *    valid ISO date-time.
 */
export async function test_api_order_return_update_by_admin_success(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new admin
  const adminInput: IShoppingMallAiBackendAdmin.ICreate = {
    username: RandomGenerator.alphabets(10),
    password_hash: RandomGenerator.alphaNumeric(32),
    name: RandomGenerator.name(),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    is_active: true,
    phone_number: RandomGenerator.mobile(),
  };
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: adminInput,
  });
  typia.assert(adminAuth);

  // 2. Prepare UUIDs for an assumed existing order and return
  const orderId = typia.random<string & tags.Format<"uuid">>();
  const returnId = typia.random<string & tags.Format<"uuid">>();

  // 3. Prepare update payload (valid enum and plausible random values)
  const validStatuses = [
    "requested",
    "approved",
    "rejected",
    "in_progress",
    "completed",
  ] as const;
  const newStatus = RandomGenerator.pick(validStatuses);
  const updateInput: IShoppingMallAiBackendOrderReturn.IUpdate = {
    status: newStatus,
    return_reason: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 12,
      wordMin: 3,
      wordMax: 8,
    }),
    completed_at: RandomGenerator.pick([null, new Date().toISOString()]),
  };

  // 4. Issue the update as the authenticated admin
  const updated =
    await api.functional.shoppingMallAiBackend.admin.orders.returns.update(
      connection,
      {
        orderId,
        returnId,
        body: updateInput,
      },
    );
  typia.assert(updated);

  // 5. Assert that response has fields matching the update and correct types
  if (updateInput.status !== undefined) {
    TestValidator.equals(
      "status is updated",
      updated.status,
      updateInput.status,
    );
  }
  if (updateInput.return_reason !== undefined) {
    TestValidator.equals(
      "return reason is updated",
      updated.return_reason,
      updateInput.return_reason,
    );
  }
  if (Object.prototype.hasOwnProperty.call(updateInput, "completed_at")) {
    TestValidator.equals(
      "completed_at is updated",
      updated.completed_at,
      updateInput.completed_at ?? null,
    );
  }
  // 6. Confirm updated_at timestamp validity (ISO date-time string)
  TestValidator.predicate(
    "updated_at is valid ISO 8601 date-time",
    !!updated.updated_at && !Number.isNaN(Date.parse(updated.updated_at)),
  );
}
