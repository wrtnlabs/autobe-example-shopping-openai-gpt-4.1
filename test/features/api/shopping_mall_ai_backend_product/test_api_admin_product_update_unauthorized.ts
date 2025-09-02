import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProduct";

export async function test_api_admin_product_update_unauthorized(
  connection: api.IConnection,
) {
  /**
   * Validate that unauthorized update attempts on products by unauthenticated
   * clients are blocked.
   *
   * This test attempts to update a product as an admin without first logging in
   * or joining as an admin. It expects the backend to enforce authorization by
   * refusing the request and returning an error (401 Unauthorized or 403
   * Forbidden).
   *
   * 1. Prepare a connection without any authentication headers set.
   * 2. Generate a random productId (uuid) and a random IUpdate object for the
   *    update body.
   * 3. Attempt to update the product via the admin API.
   * 4. Verify that TestValidator.error catches the authorization failure.
   * 5. Confirm that no sensitive product data is leaked even on error (stretch
   *    goal: not implemented if API does not return bodies on auth failure).
   */
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthorized product update should fail",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.products.update(
        unauthConn,
        {
          productId: typia.random<string & tags.Format<"uuid">>(),
          body: typia.random<IShoppingMallAiBackendProduct.IUpdate>(),
        },
      );
    },
  );
}
