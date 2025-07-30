import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAimallBackendCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCart";
import type { IAimallBackendCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCartItem";

/**
 * Validates removing a single cart item from a customer's active cart.
 *
 * Business context: Customers may wish to remove unwanted products from their
 * shopping cart before finalizing a purchase. This E2E test ensures that when a
 * customer deletes an item from their own cart, the item is truly deleted, the
 * rest of the cart remains correct, and ownership and boundary rules are
 * enforced.
 *
 * Step-by-step validation:
 *
 * 1. Register a new customer (with random but valid information).
 * 2. Create a cart for this customer (ownership assigned via customer id).
 * 3. Add two different cart items to the cart (to test delete affects only one).
 * 4. Delete one specific cart item using the correct cartId and cartItemId.
 * 5. Confirm that the deleted item no longer exists in the cart by attempting to
 *    delete it again (should fail), verifying both deletion and boundary
 *    enforcement.
 *
 * Note: As there are no available APIs for cart item listing/reading,
 * validation of remaining cart items after deletion cannot be fully performed
 * except via boundary re-deletion.
 */
export async function test_api_aimall_backend_customer_carts_cartItems_test_customer_deletes_own_cart_item_successfully(
  connection: api.IConnection,
) {
  // 1. Register a new customer
  const email: string = typia.random<string & tags.Format<"email">>();
  const phone: string = typia.random<string>();
  const customer = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: {
        email,
        phone,
        status: "active",
        password_hash: null,
      } satisfies IAimallBackendCustomer.ICreate,
    },
  );
  typia.assert(customer);

  // 2. Create a cart for this customer
  const cart = await api.functional.aimall_backend.customer.carts.create(
    connection,
    {
      body: {
        aimall_backend_customer_id: customer.id,
      } satisfies IAimallBackendCart.ICreate,
    },
  );
  typia.assert(cart);

  // 3. Add two different items into the cart
  const productId1 = typia.random<string & tags.Format<"uuid">>();
  const productId2 = typia.random<string & tags.Format<"uuid">>();
  const unitPrice1 = typia.random<number>();
  const unitPrice2 = typia.random<number>();

  const cartItem1 =
    await api.functional.aimall_backend.customer.carts.cartItems.create(
      connection,
      {
        cartId: cart.id,
        body: {
          aimall_backend_product_id: productId1,
          quantity: 1,
          unit_price_snapshot: unitPrice1,
        } satisfies IAimallBackendCartItem.ICreate,
      },
    );
  typia.assert(cartItem1);
  const cartItem2 =
    await api.functional.aimall_backend.customer.carts.cartItems.create(
      connection,
      {
        cartId: cart.id,
        body: {
          aimall_backend_product_id: productId2,
          quantity: 2,
          unit_price_snapshot: unitPrice2,
        } satisfies IAimallBackendCartItem.ICreate,
      },
    );
  typia.assert(cartItem2);

  // 4. Delete the first item
  await api.functional.aimall_backend.customer.carts.cartItems.erase(
    connection,
    { cartId: cart.id, cartItemId: cartItem1.id },
  );

  // 5. Confirm the deleted item is gone (boundary): try to delete again, assert error
  await TestValidator.error("deleted cart item cannot be deleted again")(
    async () =>
      api.functional.aimall_backend.customer.carts.cartItems.erase(connection, {
        cartId: cart.id,
        cartItemId: cartItem1.id,
      }),
  );
  // (No API for explicit cart items listing - so only boundary test possible here)
}
