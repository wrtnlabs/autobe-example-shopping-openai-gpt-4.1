import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCart";
import type { IPageIShoppingMallAiBackendCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendCart";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function test_api_customer_cart_search_unauthorized_access_denied(
  connection: api.IConnection,
) {
  /**
   * Test: Unauthenticated access to shopping cart search (customer role)
   *
   * This function verifies that an unauthenticated user (with no authorization
   * header or login context) is strictly denied access when attempting to
   * search shopping carts via PATCH /shoppingMallAiBackend/customer/carts.
   *
   * Steps:
   *
   * 1. Do NOT call any customer authentication or join endpoint (remains
   *    completely unauthorized).
   * 2. Create a connection with empty headers to guarantee there is no
   *    Authorization or other residual tokens present.
   * 3. Prepare the minimal carts search request body
   *    (IShoppingMallAiBackendCart.IRequest with all fields omitted).
   * 4. Call the carts search endpoint as an anonymous client.
   * 5. Use TestValidator.error (with await, since the callback is async) to assert
   *    that access is denied and no cart data is returned.
   *
   * The test passes if and only if the API throws an authorization error
   * (rejects the call when unauthenticated). If cart data is returned or the
   * call succeeds, this indicates a critical security breach.
   */
  await TestValidator.error(
    "unauthenticated customer cart search must be denied",
    async () => {
      await api.functional.shoppingMallAiBackend.customer.carts.index(
        { ...connection, headers: {} },
        {
          body: {},
        },
      );
    },
  );
}
