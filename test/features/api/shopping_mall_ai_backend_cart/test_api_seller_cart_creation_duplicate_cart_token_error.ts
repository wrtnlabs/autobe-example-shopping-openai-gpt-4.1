import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendSeller";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCart";

/**
 * Validate duplicate cart_token creation is blocked for seller carts.
 *
 * Test business rule: a seller may not have multiple carts with the same
 * cart_token.
 *
 * Workflow:
 *
 * 1. Seller registration: join with unique random credentials and authenticate
 *    (JWT stored).
 * 2. Seller cart creation: create a seller cart with a unique cart_token.
 * 3. Attempt to create a second seller cart with the same cart_token.
 * 4. Validation: The second creation must fail with a conflict/validation
 *    error.
 */
export async function test_api_seller_cart_creation_duplicate_cart_token_error(
  connection: api.IConnection,
) {
  // 1. Seller registration
  const sellerEmail: string = typia.random<string & tags.Format<"email">>();
  const businessRegNo: string = RandomGenerator.alphaNumeric(10);
  const sellerName: string = RandomGenerator.name();
  const authorized = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      business_registration_number: businessRegNo,
      name: sellerName,
    } satisfies IShoppingMallAiBackendSeller.ICreate,
  });
  typia.assert(authorized);
  // 2. First cart creation with a unique cart_token
  const cartToken: string = RandomGenerator.alphaNumeric(32);
  const status: string = "active";
  const cart1 = await api.functional.shoppingMallAiBackend.seller.carts.create(
    connection,
    {
      body: {
        cart_token: cartToken,
        status: status,
      } satisfies IShoppingMallAiBackendCart.ICreate,
    },
  );
  typia.assert(cart1);
  // 3. Attempt duplicate cart creation (same cart_token)
  await TestValidator.error(
    "duplicate seller cart_token should result in conflict or validation error",
    async () => {
      await api.functional.shoppingMallAiBackend.seller.carts.create(
        connection,
        {
          body: {
            cart_token: cartToken,
            status: status,
          } satisfies IShoppingMallAiBackendCart.ICreate,
        },
      );
    },
  );
}
