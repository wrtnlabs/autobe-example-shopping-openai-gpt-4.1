import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendOrderExchange } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendOrderExchange";
import type { EOrderExchangeStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/EOrderExchangeStatus";
import type { IPageIShoppingMallAiBackendOrderExchange } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendOrderExchange";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function test_api_order_exchange_admin_list_success(
  connection: api.IConnection,
) {
  /**
   * [ADMIN] List order exchanges (paginated, filtered).
   *
   * 1. Register and authenticate a new admin to establish the context needed for
   *    listing order exchanges.
   * 2. Attempt to list all exchange requests on a randomly generated
   *    (pseudo-existing) order ID, using patch
   *    /shoppingMallAiBackend/admin/orders/{orderId}/exchanges.
   * 3. Supply various filters (page/limit/status) in the request body and validate
   *    the returned exchange request structures, pagination details, and that
   *    all key fields are present and correct.
   *
   * This ensures the backend correctly implements pagination, filtering, and
   * admin authentication workflows for the order exchange index endpoint.
   */

  // Step 1: Admin registration and login (join)
  const adminJoinInput: IShoppingMallAiBackendAdmin.ICreate = {
    username: RandomGenerator.alphabets(8),
    password_hash: RandomGenerator.alphaNumeric(32),
    name: RandomGenerator.name(),
    email: `${RandomGenerator.alphabets(4)}@example.com`,
    is_active: true,
    phone_number: RandomGenerator.mobile(),
  };
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: adminJoinInput,
  });
  typia.assert(adminAuth);
  // After .join, token is automatically attached to connection.headers.

  // Step 2: Issue exchange list query (random orderId for structural/logic validation)
  const orderId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // Use a typical page/limit and status filter (e.g. 'requested')
  const requestBody: IShoppingMallAiBackendOrderExchange.IRequest = {
    page: 1,
    limit: 10,
    status: "requested",
    // Optionally test date range filters:
    date_start: undefined,
    date_end: undefined,
  };
  const exchangePage =
    await api.functional.shoppingMallAiBackend.admin.orders.exchanges.index(
      connection,
      {
        orderId,
        body: requestBody,
      },
    );
  typia.assert(exchangePage);

  // Step 3: Validate pagination fields
  const { pagination, data } = exchangePage;
  TestValidator.predicate(
    "pagination current page is 1",
    pagination.current === 1,
  );
  TestValidator.predicate("pagination limit is 10", pagination.limit === 10);
  TestValidator.predicate(
    "pagination records non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    pagination.pages >= 0,
  );
  TestValidator.equals("data is array", Array.isArray(data), true);

  // Step 4: Validate exchange object structure (if any)
  for (const exch of data) {
    typia.assert<IShoppingMallAiBackendOrderExchange>(exch);
    TestValidator.equals(
      "orderId matches in exchange object",
      exch.shopping_mall_ai_backend_order_id,
      orderId,
    );
    TestValidator.predicate(
      "status is valid enum",
      [
        "requested",
        "approved",
        "rejected",
        "in_progress",
        "completed",
      ].includes(exch.status),
    );
    TestValidator.predicate(
      "id is uuid",
      typeof exch.id === "string" &&
        exch.id.length >= 30 &&
        exch.id.includes("-"),
    );
    TestValidator.predicate(
      "exchange_reason present",
      typeof exch.exchange_reason === "string" &&
        exch.exchange_reason.length > 0,
    );
    TestValidator.predicate(
      "requested_at is iso date",
      typeof exch.requested_at === "string" && exch.requested_at.includes("T"),
    );
    TestValidator.predicate(
      "created_at is iso date",
      typeof exch.created_at === "string" && exch.created_at.includes("T"),
    );
    TestValidator.predicate(
      "updated_at is iso date",
      typeof exch.updated_at === "string" && exch.updated_at.includes("T"),
    );
  }
}
