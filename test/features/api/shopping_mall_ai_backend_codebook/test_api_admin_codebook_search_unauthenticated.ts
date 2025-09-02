import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendCodebook } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCodebook";
import type { IPageIShoppingMallAiBackendCodebook } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendCodebook";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function test_api_admin_codebook_search_unauthenticated(
  connection: api.IConnection,
) {
  /**
   * Validate that codebook search is rejected when no admin authentication is
   * present.
   *
   * This test deliberately omits the /auth/admin/join registration/login call
   * and uses a connection that lacks any Authorization header. The
   * /shoppingMallAiBackend/admin/codebooks PATCH endpoint should enforce
   * admin-only access and reject unauthenticated attempts with an appropriate
   * error.
   *
   * Steps:
   *
   * 1. Prepare an unauthenticated connection (ensure connection.headers is empty
   *    or undefined).
   * 2. Attempt a PATCH request to /shoppingMallAiBackend/admin/codebooks with a
   *    minimal valid request body.
   * 3. Assert that the request fails and returns an authentication/authorization
   *    error (401 or 403).
   */
  // Step 1: Prepare unauthenticated connection (no Authorization header)
  const unauthConnection: api.IConnection = { ...connection, headers: {} };

  // Step 2: Attempt codebook search with minimal body, expect error
  await TestValidator.error(
    "codebook search must fail without admin authentication",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.codebooks.index(
        unauthConnection,
        {
          body: {}, // Minimal valid search/filter request
        },
      );
    },
  );
}
