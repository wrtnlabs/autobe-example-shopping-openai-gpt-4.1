import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendSeller";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCart";
import type { IPageIShoppingMallAiBackendCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendCart";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function test_api_seller_cart_search_unauthorized_role_access_denied(
  connection: api.IConnection,
) {
  /**
   * Validate access control for seller cart search API.
   *
   * This test ensures that only authenticated sellers can search seller carts
   * via /shoppingMallAiBackend/seller/carts. It verifies that an
   * unauthenticated user, or one without proper seller credentials, is denied
   * access (receives an error response).
   *
   * Steps:
   *
   * 1. Register a seller account (for business process completeness, though not
   *    used to authorize the next request)
   * 2. Create a fresh connection object with no Authorization header (simulating
   *    an unauthenticated user)
   * 3. Attempt to access the seller cart search endpoint with this unauthenticated
   *    connection
   * 4. Assert that the attempt fails (error is thrown by the API)
   */

  // 1. Register a seller account to maintain system state completeness
  const sellerJoin = await api.functional.auth.seller.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      business_registration_number: RandomGenerator.alphaNumeric(10),
      name: RandomGenerator.name(),
    } satisfies IShoppingMallAiBackendSeller.ICreate,
  });
  typia.assert(sellerJoin);

  // 2. Set up a connection object without Authorization header for unauthenticated access
  const unauthConnection: api.IConnection = { ...connection, headers: {} };

  // 3 & 4. Attempt seller cart search; expect access denied (error is thrown)
  await TestValidator.error(
    "unauthenticated access to seller cart search should fail",
    async () => {
      await api.functional.shoppingMallAiBackend.seller.carts.index(
        unauthConnection,
        {
          body: {} satisfies IShoppingMallAiBackendCart.IRequest,
        },
      );
    },
  );
}
