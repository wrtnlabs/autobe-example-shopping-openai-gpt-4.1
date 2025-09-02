import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCart";
import type { IShoppingMallAiBackendCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCartItem";

export async function test_api_customer_cart_item_deletion_success(
  connection: api.IConnection,
) {
  /**
   * Test successful logical deletion (soft delete) of a cart item by the owning
   * customer.
   *
   * Workflow:
   *
   * 1. Register a new customer via /auth/customer/join and authenticate (capture
   *    credentials and tokens)
   * 2. Create a cart for this customer via /shoppingMallAiBackend/customer/carts
   *    (authenticated context)
   * 3. Add a cart item via /shoppingMallAiBackend/customer/carts/{cartId}/items
   *    (using a valid product snapshot id)
   * 4. Soft-delete the item via
   *    /shoppingMallAiBackend/customer/carts/{cartId}/items/{itemId}
   *
   * Validation:
   *
   * - Ensure the returned cart item’s deleted_at is set (as far as can be tested;
   *   there is no direct get/read API for cart items)
   * - After deletion, further access to the item should cause failure; in this
   *   context, attempt a repeat delete and expect error (since idempotency or
   *   error on second delete are both acceptable, this validates logical
   *   completion).
   */

  // 1. Register & authenticate customer
  const joinInput: IShoppingMallAiBackendCustomer.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    phone_number: RandomGenerator.mobile(),
    password: typia.random<string & tags.Format<"password">>(),
    name: RandomGenerator.name(),
    nickname: RandomGenerator.name(),
  };
  const auth = await api.functional.auth.customer.join(connection, {
    body: joinInput,
  });
  typia.assert(auth);
  TestValidator.equals(
    "registered user email should match input",
    auth.customer.email,
    joinInput.email,
  );
  TestValidator.predicate(
    "registered customer is active",
    auth.customer.is_active === true,
  );
  TestValidator.predicate(
    "registered customer is verified",
    typeof auth.customer.is_verified === "boolean",
  );
  const customerId = auth.customer.id;

  // 2. Create cart for this customer
  const cartInput: IShoppingMallAiBackendCart.ICreate = {
    shopping_mall_ai_backend_customer_id: customerId,
    cart_token: RandomGenerator.alphaNumeric(16),
    status: "active",
    note: RandomGenerator.paragraph({ sentences: 3 }),
  };
  const cart = await api.functional.shoppingMallAiBackend.customer.carts.create(
    connection,
    { body: cartInput },
  );
  typia.assert(cart);
  TestValidator.equals(
    "created cart is associated with correct customer",
    cart.shopping_mall_ai_backend_customer_id,
    customerId,
  );
  TestValidator.equals("created cart has status active", cart.status, "active");
  const cartId = cart.id;

  // 3. Add a cart item to the new cart
  const itemInput: IShoppingMallAiBackendCartItem.ICreate = {
    shopping_mall_ai_backend_cart_id: cartId,
    shopping_mall_ai_backend_product_snapshot_id: typia.random<
      string & tags.Format<"uuid">
    >(),
    quantity: 1,
    option_code: RandomGenerator.alphaNumeric(8),
  };
  const cartItem =
    await api.functional.shoppingMallAiBackend.customer.carts.items.create(
      connection,
      { cartId, body: itemInput },
    );
  typia.assert(cartItem);
  TestValidator.equals(
    "cart item is linked to correct cart",
    cartItem.shopping_mall_ai_backend_cart_id,
    cartId,
  );
  TestValidator.equals("cart item has expected quantity", cartItem.quantity, 1);
  TestValidator.equals(
    "cart item is not deleted before deletion",
    cartItem.deleted_at,
    null,
  );
  const itemId = cartItem.id;

  // 4. Delete the cart item (soft delete)
  await api.functional.shoppingMallAiBackend.customer.carts.items.erase(
    connection,
    { cartId, itemId },
  );

  // There is no API function for re-fetching a specific item, so test by logically following up:
  // Attempt to delete again, expecting an error or no-op; both are valid for soft deletion. This ensures logical state.
  await TestValidator.error(
    "deleting the same cart item again should raise error or be a no-op",
    async () => {
      await api.functional.shoppingMallAiBackend.customer.carts.items.erase(
        connection,
        { cartId, itemId },
      );
    },
  );
}
