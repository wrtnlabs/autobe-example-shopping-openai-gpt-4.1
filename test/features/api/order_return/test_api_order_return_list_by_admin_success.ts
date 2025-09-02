import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendOrderReturn } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendOrderReturn";
import type { EOrderReturnStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/EOrderReturnStatus";
import type { IPageIShoppingMallAiBackendOrderReturn } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendOrderReturn";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function test_api_order_return_list_by_admin_success(
  connection: api.IConnection,
) {
  /**
   * E2E test: Admin can retrieve paginated and filterable list of returns for
   * an order.
   *
   * 1. Register a new admin and authenticate.
   * 2. Prepare or select a known order ID (due to missing creation endpoint,
   *    random UUID used for demonstration).
   * 3. (Mock step in code) At least one return should exist for the order; step
   *    described as comment because return creation endpoint is unavailable in
   *    SDK.
   * 4. Call admin returns index endpoint with filter and pagination options as
   *    body.
   * 5. Validate:
   *
   *    - Response is paginated (pagination structure present and logical).
   *    - All items returned have shopping_mall_ai_backend_order_id matching orderId.
   *    - All metadata/status/reason fields are present per
   *         IShoppingMallAiBackendOrderReturn structure.
   *    - No forbidden/unauthorized errors, and data is correct.
   */

  // 1. Register a new admin and authenticate
  const adminUsername = RandomGenerator.alphaNumeric(10);
  const adminPasswordHash = RandomGenerator.alphaNumeric(32); // Treated as already hashed in test
  const adminEmail = `${adminUsername}@e2e-test.com`;
  const adminName = RandomGenerator.name();
  const adminPhone = RandomGenerator.mobile();
  const adminIsActive = true;
  const joinAuth = await api.functional.auth.admin.join(connection, {
    body: {
      username: adminUsername,
      password_hash: adminPasswordHash,
      name: adminName,
      email: adminEmail,
      phone_number: adminPhone,
      is_active: adminIsActive,
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });
  typia.assert(joinAuth);

  // 2. Prepare a known orderId. In reality, must ensure order exists and at least one return is present.
  //    Here we use a random UUID, since order/create endpoints are missing from provided materials.
  const orderId = typia.random<string & tags.Format<"uuid">>();

  // 3. (COMMENT ONLY) At this point, at least one return request would have been created via non-provided endpoints.
  //    Since no return creation endpoint is in the SDK, this cannot be performed directly here.

  // 4. Query returns for the order with a filter/pagination body.
  const requestBody: IShoppingMallAiBackendOrderReturn.IRequest = {
    page: 1,
    limit: 10,
    status: RandomGenerator.pick([
      "requested",
      "approved",
      "rejected",
      "in_progress",
      "completed",
    ] as const),
    // Optionally, date_start/date_end could be added here for finer filtering
  };
  const returnsPage =
    await api.functional.shoppingMallAiBackend.admin.orders.returns.index(
      connection,
      {
        orderId,
        body: requestBody,
      },
    );
  typia.assert(returnsPage);

  // 5. Business validations: structure, correctness, and access control
  TestValidator.predicate(
    "returnsPage.pagination structure is present",
    typeof returnsPage.pagination === "object" &&
      returnsPage.pagination !== null,
  );
  TestValidator.predicate(
    "returnsPage.data is array",
    Array.isArray(returnsPage.data),
  );
  TestValidator.equals(
    "returnsPage.pagination.current matches page in request",
    returnsPage.pagination.current,
    requestBody.page,
  );
  TestValidator.equals(
    "returnsPage.pagination.limit matches limit in request",
    returnsPage.pagination.limit,
    requestBody.limit,
  );
  for (const ret of returnsPage.data) {
    typia.assert(ret);
    TestValidator.equals(
      "return record has expected orderId",
      ret.shopping_mall_ai_backend_order_id,
      orderId,
    );
    if (requestBody.status) {
      TestValidator.equals(
        "return record matches requested status",
        ret.status,
        requestBody.status,
      );
    }
    TestValidator.predicate(
      "return id is a string",
      typeof ret.id === "string",
    );
    TestValidator.predicate(
      "return reason is a string",
      typeof ret.return_reason === "string",
    );
    TestValidator.predicate(
      "return requested_at present",
      typeof ret.requested_at === "string",
    );
    TestValidator.predicate(
      "created_at present",
      typeof ret.created_at === "string",
    );
    // processed_at, completed_at, and deleted_at may be null or undefined; assert if present
    if (ret.processed_at !== null && ret.processed_at !== undefined)
      TestValidator.predicate(
        "processed_at present",
        typeof ret.processed_at === "string",
      );
    if (ret.completed_at !== null && ret.completed_at !== undefined)
      TestValidator.predicate(
        "completed_at present",
        typeof ret.completed_at === "string",
      );
    if (ret.deleted_at !== null && ret.deleted_at !== undefined)
      TestValidator.predicate(
        "deleted_at present",
        typeof ret.deleted_at === "string",
      );
  }
}
