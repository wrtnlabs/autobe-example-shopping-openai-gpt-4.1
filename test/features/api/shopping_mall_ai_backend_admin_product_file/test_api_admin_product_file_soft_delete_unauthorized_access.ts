import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Test unauthorized access when soft deleting a product file.
 *
 * This test verifies that an unauthenticated (not-logged-in) client is
 * denied access to the logical (soft) deletion endpoint for product files.
 * Attempts to call the admin-level product file deletion endpoint without
 * an admin Authorization token should fail. The goal is to confirm that the
 * access control layer is correctly enforced: deletion operations require
 * admin authentication. The test ensures that no deletion occurs and a
 * proper authorization error is returned.
 *
 * Steps:
 *
 * 1. Do not authenticate/admin join (simulate a non-authenticated context).
 * 2. Generate random UUIDs for productId and fileId.
 * 3. Attempt to call
 *    api.functional.shoppingMallAiBackend.admin.products.files.erase with
 *    these IDs.
 * 4. Validate that an authorization/permission error occurs using
 *    TestValidator.error.
 */
export async function test_api_admin_product_file_soft_delete_unauthorized_access(
  connection: api.IConnection,
) {
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  const productId = typia.random<string & tags.Format<"uuid">>();
  const fileId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "unauthorized file deletion should fail",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.products.files.erase(
        unauthConn,
        { productId, fileId },
      );
    },
  );
}
