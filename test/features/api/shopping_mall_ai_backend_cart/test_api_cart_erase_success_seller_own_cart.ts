import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendSeller";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCart";

/**
 * Test that a seller can successfully soft-delete (logically delete) their
 * own shopping cart.
 *
 * Steps:
 *
 * 1. Register a new seller to establish authentication for the seller role.
 * 2. As the seller, create a new cart with the minimum required fields (token,
 *    status).
 * 3. Use the seller's credentials to delete (soft delete) the created cart via
 *    the erase endpoint, identifying by its cartId.
 * 4. Confirm the erase operation succeeds (no error is thrown) and -- if
 *    possible -- reload the cart (if a get endpoint existed) to ensure the
 *    cart's 'deleted_at' timestamp is set (indicating logical deletion).
 * 5. Optionally, confirm further business logic: deleted carts remain in the
 *    system for audit purposes, cannot be acted on for commerce, but can be
 *    audited for evidence.
 *
 * This test validates the compliance and access controls of logical
 * deletion for seller-owned carts.
 */
export async function test_api_cart_erase_success_seller_own_cart(
  connection: api.IConnection,
) {
  // 1. Register a seller.
  const sellerCreate: IShoppingMallAiBackendSeller.ICreate = {
    email: typia.random<string & tags.Format<"email">>(),
    business_registration_number: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
  };
  const auth: IShoppingMallAiBackendSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, { body: sellerCreate });
  typia.assert(auth);

  // 2. As seller, create a new cart.
  const cartCreate: IShoppingMallAiBackendCart.ICreate = {
    cart_token: RandomGenerator.alphaNumeric(16),
    status: "active",
    note: RandomGenerator.paragraph({ sentences: 5 }),
  };
  const cart: IShoppingMallAiBackendCart =
    await api.functional.shoppingMallAiBackend.seller.carts.create(connection, {
      body: cartCreate,
    });
  typia.assert(cart);

  // 3. Delete (soft-delete) the cart as its owning seller.
  await api.functional.shoppingMallAiBackend.seller.carts.erase(connection, {
    cartId: cart.id,
  });

  // 4. There is no reload/get endpoint; if available, we would validate that deleted_at is set post-erase.
  // Since only the erase op is exposed, the absence of error indicates success.
}
