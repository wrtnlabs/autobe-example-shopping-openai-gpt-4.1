import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendOrderReturn } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendOrderReturn";

export async function test_api_order_return_detail_by_admin_not_found_or_no_permission(
  connection: api.IConnection,
) {
  /**
   * Test error responses for attempts to view a return that doesn't exist, is
   * unrelated, or is out of permitted scope as an admin.
   *
   * Steps:
   *
   * 1. Register a new admin account and obtain admin authentication.
   * 2. Attempt to access a return with entirely non-existent orderId and returnId
   *    – expect a not found or forbidden error.
   * 3. Attempt to access a return using mismatched orderId and returnId pairs to
   *    check linkage or existence – expect error response.
   * 4. Validate that the admin cannot traverse or leak non-existent/unlinked
   *    return data.
   */

  // 1. Register an admin account, get admin authentication
  const adminUsername = RandomGenerator.alphabets(10);
  const admin: IShoppingMallAiBackendAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        username: adminUsername,
        password_hash: RandomGenerator.alphaNumeric(32),
        name: RandomGenerator.name(2),
        email: `${adminUsername}@admin-e2e.com` as string &
          tags.Format<"email">,
        phone_number: RandomGenerator.mobile(),
        is_active: true,
      } satisfies IShoppingMallAiBackendAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Try accessing a non-existent return (random UUIDs): should error (not found or forbidden)
  const nonExistentOrderId = typia.random<string & tags.Format<"uuid">>();
  const nonExistentReturnId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "admin cannot view nonexistent return: random uuids",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.orders.returns.at(
        connection,
        {
          orderId: nonExistentOrderId,
          returnId: nonExistentReturnId,
        },
      );
    },
  );

  // 3. Try accessing with mismatched orderId/returnId to check linkage enforcement
  const anotherFakeOrderId = typia.random<string & tags.Format<"uuid">>();
  const anotherFakeReturnId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "admin cannot view return not linked to order",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.orders.returns.at(
        connection,
        {
          orderId: anotherFakeOrderId,
          returnId: anotherFakeReturnId,
        },
      );
    },
  );
}
