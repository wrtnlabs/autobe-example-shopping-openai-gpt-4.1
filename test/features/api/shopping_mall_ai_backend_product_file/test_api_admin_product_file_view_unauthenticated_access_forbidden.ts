import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendProductFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductFile";

export async function test_api_admin_product_file_view_unauthenticated_access_forbidden(
  connection: api.IConnection,
) {
  /**
   * Validate unauthenticated access denial for admin product file metadata
   * endpoint.
   *
   * This test confirms that accessing the admin-only endpoint for retrieving a
   * product file's metadata (GET
   * /shoppingMallAiBackend/admin/products/{productId}/files/{fileId}) without
   * authentication is forbidden. It simulates a scenario where an
   * unauthenticated client attempts direct access, ensuring that the API
   * enforces authorization requirements.
   *
   * Steps:
   *
   * 1. Prepare an unprivileged (unauthenticated) connection—ensure headers have no
   *    Authorization set.
   * 2. Generate random UUIDs for productId and fileId to invoke the endpoint with
   *    valid formats.
   * 3. Attempt to call the admin products.files.at function.
   * 4. Assert that the call is forbidden with an authentication/authorization
   *    error (401 or 403).
   */

  // 1. Prepare unauthenticated connection (remove any token)
  const unauthConnection: api.IConnection = { ...connection, headers: {} };

  // 2. Attempt to access admin-only endpoint without authentication
  await TestValidator.error(
    "unauthenticated user is forbidden from accessing admin product file metadata",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.products.files.at(
        unauthConnection,
        {
          productId: typia.random<string & tags.Format<"uuid">>(),
          fileId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
