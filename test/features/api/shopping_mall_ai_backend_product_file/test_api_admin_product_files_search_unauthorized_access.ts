import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendProductFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductFile";
import type { IPageIShoppingMallAiBackendProductFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendProductFile";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Test denial of product file metadata search to unauthenticated callers
 * (admin privilege required).
 *
 * This test attempts to search for metadata about files/images attached to
 * a product via the PATCH
 * /shoppingMallAiBackend/admin/products/{productId}/files endpoint WITHOUT
 * any admin authentication.
 *
 * - It ensures that performing this operation without prior admin join/login
 *   results in an authorization error (such as 401 Unauthorized), proving
 *   that only authenticated admins can search for product files in backend
 *   admin scope.
 *
 * Test steps:
 *
 * 1. Construct a connection object with NO Authorization token set (admin is
 *    not authenticated at all).
 * 2. Attempt to call the admin product file search endpoint (with a random
 *    productId and minimal search body).
 * 3. Use TestValidator.error to assert that the call fails for lack of
 *    authentication.
 * 4. Do not perform admin join/login anywhere in this test - the context must
 *    remain unauthenticated throughout.
 */
export async function test_api_admin_product_files_search_unauthorized_access(
  connection: api.IConnection,
) {
  // 1. Ensure test runs with NO authentication: construct explicit empty headers.
  //    NOTE: If this test is run after tests that may have set admin Authorization, this ensures stateless, unauthenticated context.
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // 2. Attempt the PATCH /shoppingMallAiBackend/admin/products/{productId}/files operation
  //    Expecting an authorization/authentication error because no admin logged in.
  await TestValidator.error(
    "denies product file search if admin not authenticated",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.products.files.index(
        unauthConn,
        {
          productId: typia.random<string & tags.Format<"uuid">>(),
          body: {} satisfies IShoppingMallAiBackendProductFile.IRequest,
        },
      );
    },
  );
}
