import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendSeller";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCart";

/**
 * Test that a seller can successfully update a cart they are authorized to
 * access.
 *
 * BUSINESS FLOW:
 *
 * 1. Register and log in as a seller (auth, token issued).
 * 2. Create a cart in seller context (initial status/note set).
 * 3. Update cart fields (status, note) via seller PUT endpoint.
 * 4. Verify fields changed and audit metadata (updated_at) reflect the update.
 * 5. Assert that immutable fields remain unchanged and all outputs are
 *    type-correct.
 *
 * This ensures that the seller permission and metadata logic is working as
 * required.
 */
export async function test_api_seller_cart_update_success(
  connection: api.IConnection,
) {
  // 1. Register and log in as seller
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const businessRegNum = RandomGenerator.alphaNumeric(10);
  const sellerName = RandomGenerator.name();
  const sellerAuth = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      business_registration_number: businessRegNum,
      name: sellerName,
    } satisfies IShoppingMallAiBackendSeller.ICreate,
  });
  typia.assert(sellerAuth);
  const sellerId = sellerAuth.seller.id;

  // 2. Create a cart in seller context
  const cartToken = RandomGenerator.alphaNumeric(16);
  const originalStatus = "active";
  const originalNote = RandomGenerator.paragraph({ sentences: 3 });
  const cartCreate =
    await api.functional.shoppingMallAiBackend.seller.carts.create(connection, {
      body: {
        cart_token: cartToken,
        status: originalStatus,
        note: originalNote,
      } satisfies IShoppingMallAiBackendCart.ICreate,
    });
  typia.assert(cartCreate);
  TestValidator.equals(
    "cart status matches input",
    cartCreate.status,
    originalStatus,
  );
  TestValidator.equals(
    "cart note matches input",
    cartCreate.note,
    originalNote,
  );
  const cartId = cartCreate.id;
  const originalUpdatedAt = cartCreate.updated_at;
  const originalCreatedAt = cartCreate.created_at;

  // 3. Update status and note fields as seller
  const updatedStatus = "submitted";
  const updatedNote = RandomGenerator.paragraph({ sentences: 5 });
  const updateRes =
    await api.functional.shoppingMallAiBackend.seller.carts.update(connection, {
      cartId,
      body: {
        status: updatedStatus,
        note: updatedNote,
      } satisfies IShoppingMallAiBackendCart.IUpdate,
    });
  typia.assert(updateRes);
  TestValidator.equals("cartId should remain the same", updateRes.id, cartId);
  TestValidator.equals("status changed", updateRes.status, updatedStatus);
  TestValidator.equals("note changed", updateRes.note, updatedNote);
  TestValidator.notEquals(
    "updated_at should change after update",
    updateRes.updated_at,
    originalUpdatedAt,
  );
  TestValidator.equals(
    "created_at must remain unchanged",
    updateRes.created_at,
    originalCreatedAt,
  );
  TestValidator.equals(
    "cart_token must remain unchanged",
    updateRes.cart_token,
    cartToken,
  );

  // 4. Verify no logical delete has occurred
  TestValidator.equals(
    "deleted_at should be null for live cart",
    updateRes.deleted_at,
    null,
  );
}
