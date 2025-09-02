import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendOrderReturn } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendOrderReturn";

export async function test_api_order_return_detail_by_admin_success(
  connection: api.IConnection,
) {
  /**
   * Validates that an authenticated admin can retrieve full details of a
   * specific return request for an order.
   *
   * 1. Register an admin via proper onboarding and set Authorization.
   * 2. Simulate valid UUIDs for orderId and returnId (no creation endpoint exists
   *    for test data).
   * 3. Retrieve return request details as admin.
   * 4. Assert business/audit fields match and are present as per spec.
   *
   * Key fields checked: order linkage, ids, return_reason, status, timestamps.
   * Notes: processed_at, completed_at, deleted_at may be null or omitted.
   */

  // 1. Admin registration to get authentication context
  const adminData: IShoppingMallAiBackendAdmin.ICreate = {
    username: RandomGenerator.alphaNumeric(8),
    password_hash: RandomGenerator.alphaNumeric(64),
    name: RandomGenerator.name(),
    email: typia.random<string & tags.Format<"email">>(),
    phone_number: RandomGenerator.mobile(),
    is_active: true,
  };
  const adminAuth: IShoppingMallAiBackendAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminData,
    });
  typia.assert(adminAuth);

  // 2. No testable create endpoint for returns, so we simulate real orderId/returnId as valid UUIDs
  const orderId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const returnId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Retrieve return record by admin credentials
  const output: IShoppingMallAiBackendOrderReturn =
    await api.functional.shoppingMallAiBackend.admin.orders.returns.at(
      connection,
      {
        orderId,
        returnId,
      },
    );
  typia.assert(output);

  // 4. Core field validations and business/audit checks
  TestValidator.equals(
    "order return orderId matches input",
    output.shopping_mall_ai_backend_order_id,
    orderId,
  );
  TestValidator.equals("order return id matches input", output.id, returnId);
  TestValidator.predicate(
    "return reason is a non-empty string",
    typeof output.return_reason === "string" && output.return_reason.length > 0,
  );
  TestValidator.predicate(
    "status is a non-empty string",
    typeof output.status === "string" && output.status.length > 0,
  );
  TestValidator.predicate(
    "requested_at is present",
    typeof output.requested_at === "string" && output.requested_at.length > 0,
  );
  TestValidator.predicate(
    "created_at is present",
    typeof output.created_at === "string" && output.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is present",
    typeof output.updated_at === "string" && output.updated_at.length > 0,
  );
  // Proof/edge checks for optional audit fields (may be null)
  // processed_at, completed_at, deleted_at are optionally validated if required, but presence is business flow dependent
}
