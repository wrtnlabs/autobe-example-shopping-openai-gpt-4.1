import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendSeller";
import type { IPageIShoppingMallAiBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendSeller";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function test_api_admin_seller_list_invalid_filter_or_unauthorized(
  connection: api.IConnection,
) {
  /**
   * Validates input and authentication error handling for the admin-sellers
   * list API.
   *
   * This test verifies:
   *
   * - That runtime-invalid but TypeScript-valid filter values (e.g., negative
   *   page number) are rejected with validation error
   * - That unauthenticated and improperly authenticated requests are denied
   *   access
   *
   * Steps:
   *
   * 1. Register a new admin for authentication context
   * 2. Attempt seller filter with business-invalid (but structurally valid)
   *    filter: page = -1 (should trigger validation error)
   * 3. Attempt endpoint with no Authorization header (should fail with
   *    unauthorized)
   * 4. Attempt endpoint with an invalid token Authorization header (should fail
   *    with unauthorized)
   */

  // 1. Register a new admin for authentication context
  const adminResult = await api.functional.auth.admin.join(connection, {
    body: {
      username: RandomGenerator.name(2).replace(/ /g, "_"),
      password_hash: RandomGenerator.alphaNumeric(32),
      name: RandomGenerator.name(),
      email: typia.random<string & tags.Format<"email">>(),
      is_active: true,
      phone_number: RandomGenerator.mobile(),
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });
  typia.assert(adminResult);

  // 2. Invalid business logic filter: negative page number (should fail at runtime)
  await TestValidator.error(
    "admin-seller filtering with negative page triggers validation error",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.sellers.index(
        connection,
        {
          body: {
            page: -1, // negative page, violates validation
          },
        },
      );
    },
  );

  // 3. No-authentication: call endpoint with headers: {}
  const unauthConnection: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated admin-seller filter triggers unauthorized",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.sellers.index(
        unauthConnection,
        {
          body: {},
        },
      );
    },
  );

  // 4. Invalid token: simulate bad Authorization value
  const invalidAuthConnection: api.IConnection = {
    ...connection,
    headers: {
      ...connection.headers,
      Authorization: "Bearer invalid_token_sample",
    },
  };
  await TestValidator.error(
    "admin-seller filter with invalid admin token triggers unauthorized",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.sellers.index(
        invalidAuthConnection,
        {
          body: {},
        },
      );
    },
  );
}
