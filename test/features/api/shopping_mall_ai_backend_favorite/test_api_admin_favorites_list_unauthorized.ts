import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendFavorite } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendFavorite";
import type { IPageIShoppingMallAiBackendFavorite } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendFavorite";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function test_api_admin_favorites_list_unauthorized(
  connection: api.IConnection,
) {
  /**
   * Test that admin favorites listing (PATCH
   * /shoppingMallAiBackend/admin/favorites) requires authentication and
   * properly rejects unauthenticated requests.
   *
   * Business context: This endpoint allows an admin to list and search their
   * favorite items, which is a privileged operation. Security policies require
   * that only authenticated admin users can access this API.
   *
   * Steps:
   *
   * 1. Prepare an unauthorized connection context with empty headers (no
   *    Authorization).
   * 2. Compose a realistic search request for admin favorites.
   * 3. Attempt to call the PATCH /shoppingMallAiBackend/admin/favorites endpoint
   *    with the unauthorized connection.
   * 4. Validate that the API call fails with an access-denied or authentication
   *    error (verifying strong enforcement of admin authentication).
   *
   * This test guarantees that the backend security layer is working as
   * intended: privileged endpoints cannot be accessed by unauthenticated
   * clients, thereby protecting sensitive admin operations from unauthorized
   * access.
   */

  // Step 1: Create a connection context with no Authorization header (fully unauthorized)
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // Step 2: Build a typical favorites search/filter request payload
  const requestBody = {
    target_type: "product",
    q: RandomGenerator.paragraph({ sentences: 2 }),
    page: 1,
    limit: 5,
    order_by: "created_at",
    direction: "desc",
  } satisfies IShoppingMallAiBackendFavorite.IRequest;

  // Step 3 & 4: Attempt the call and ensure authentication enforcement (access denied)
  await TestValidator.error(
    "admin favorites listing must be rejected without authentication",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.favorites.index(
        unauthConn,
        {
          body: requestBody,
        },
      );
    },
  );
}
