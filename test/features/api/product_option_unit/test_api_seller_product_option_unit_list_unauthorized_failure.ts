import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendSeller";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendProductOptionUnits } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductOptionUnits";
import type { IPageIShoppingMallAiBackendProductOptionUnits } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendProductOptionUnits";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function test_api_seller_product_option_unit_list_unauthorized_failure(
  connection: api.IConnection,
) {
  /**
   * Test that unauthorized (non-authenticated) access to the product option
   * unit list returns an authorization error.
   *
   * 1. Register a seller (to illustrate positive flow dependency, but do not use
   *    its token for the tested API).
   * 2. Prepare a fresh connection object with empty headers to simulate no
   *    authentication.
   * 3. Attempt to call PATCH
   *    /shoppingMallAiBackend/seller/products/{productId}/options/{optionId}/units
   *    as an anonymous user.
   * 4. Assert that an authorization/permission error is thrown using
   *    TestValidator.error.
   *
   * This verifies that sellers' option unit lists cannot be retrieved without
   * authentication, enforcing backend access control contract.
   */
  // 1. Register a seller (token/profile will not be used)
  const _seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      business_registration_number: typia.random<string>(),
      name: RandomGenerator.name(),
    } satisfies IShoppingMallAiBackendSeller.ICreate,
  });
  typia.assert(_seller);

  // 2. Clear headers: simulate truly unauthenticated state (NO Authorization)
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // 3 & 4. Make the unauthorized request and check for error response
  await TestValidator.error(
    "should throw authorization error when listing seller product option units without authentication",
    async () => {
      await api.functional.shoppingMallAiBackend.seller.products.options.units.index(
        unauthConn,
        {
          productId: typia.random<string & tags.Format<"uuid">>(),
          optionId: typia.random<string & tags.Format<"uuid">>(),
          body: typia.random<IShoppingMallAiBackendProductOptionUnits.IRequest>(),
        },
      );
    },
  );
}
