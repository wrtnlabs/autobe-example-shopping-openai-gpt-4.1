import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAimallBackendCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCart";
import type { IPageIAimallBackendCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendCartItem";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAimallBackendCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCartItem";

/**
 * E2E test for updating the quantity of an existing cart item in a customer's
 * shopping cart as an administrator.
 *
 * This test validates that admin can update the quantity of a cart item,
 * following a complete admin workflow.
 *
 * **Steps:**
 *
 * 1. Register a new customer (so cart can be assigned to a valid person)
 * 2. Create a cart for the customer using the administrator endpoint
 * 3. Add a cart item (with quantity=1) to the cart using the administrator
 *    endpoint
 * 4. Retrieve the items in the cart and locate the just-added cart item
 * 5. Update the quantity of the cart item (PUT, as admin), e.g., from 1 to 2
 * 6. Validate: (a) the updated cart item reflects the new quantity, (b) immutable
 *    fields (like product id) are unchanged
 * 7. Re-fetch the cart items, verify the update persisted
 * 8. Validate business rules: fail to update to quantity=0 (should throw error;
 *    quantity must be > 0)
 */
export async function test_api_aimall_backend_administrator_carts_cartItems_test_update_cart_item_quantity_successfully_as_admin(
  connection: api.IConnection,
) {
  // 1. Register a new customer
  const customer = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: {
        email: typia.random<string>(),
        phone: typia.random<string>(),
        password_hash: null,
        status: "active",
      } satisfies IAimallBackendCustomer.ICreate,
    },
  );
  typia.assert(customer);

  // 2. Create a cart assigned to this customer
  const cart = await api.functional.aimall_backend.administrator.carts.create(
    connection,
    {
      body: {
        aimall_backend_customer_id: customer.id,
      } satisfies IAimallBackendCart.ICreate,
    },
  );
  typia.assert(cart);

  // 3. Add a cart item to the new cart
  const initialQuantity = 1;
  const cartItem =
    await api.functional.aimall_backend.administrator.carts.cartItems.create(
      connection,
      {
        cartId: cart.id,
        body: {
          aimall_backend_product_id: typia.random<
            string & tags.Format<"uuid">
          >(),
          aimall_backend_product_option_id: null,
          aimall_backend_sku_id: null,
          quantity: initialQuantity,
          unit_price_snapshot: 10000,
          discount_snapshot: null,
          selected_name_display: null,
        } satisfies IAimallBackendCartItem.ICreate,
      },
    );
  typia.assert(cartItem);
  TestValidator.equals("initial quantity is set")(cartItem.quantity)(
    initialQuantity,
  );

  // 4. Retrieve the cart items for this cart
  const cartItemsPage =
    await api.functional.aimall_backend.administrator.carts.cartItems.index(
      connection,
      { cartId: cart.id },
    );
  typia.assert(cartItemsPage);
  const found = cartItemsPage.data.find((item) => item.id === cartItem.id);
  TestValidator.predicate("Cart item was found")(!!found);
  TestValidator.equals("Cart item id matches")(found?.id)(cartItem.id);
  TestValidator.equals("quantity matches before update")(found?.quantity)(
    initialQuantity,
  );

  // 5. Update the cart item quantity from 1 to 2
  const updatedQuantity = 2;
  const updatedCartItem =
    await api.functional.aimall_backend.administrator.carts.cartItems.update(
      connection,
      {
        cartId: cart.id,
        cartItemId: cartItem.id,
        body: {
          quantity: updatedQuantity,
          updated_at: new Date().toISOString(),
        } satisfies IAimallBackendCartItem.IUpdate,
      },
    );
  typia.assert(updatedCartItem);
  TestValidator.equals("quantity updated")(updatedCartItem.quantity)(
    updatedQuantity,
  );
  TestValidator.equals("product id unchanged")(
    updatedCartItem.aimall_backend_product_id,
  )(cartItem.aimall_backend_product_id);

  // 6. Re-fetch cart items to confirm update persisted
  const cartItemsPageAfter =
    await api.functional.aimall_backend.administrator.carts.cartItems.index(
      connection,
      { cartId: cart.id },
    );
  typia.assert(cartItemsPageAfter);
  const afterUpdate = cartItemsPageAfter.data.find(
    (item) => item.id === cartItem.id,
  );
  TestValidator.predicate("updated cart item persisted")(!!afterUpdate);
  TestValidator.equals("quantity persisted")(afterUpdate?.quantity)(
    updatedQuantity,
  );

  // 7. Negative: Attempt to update quantity to 0 (should fail)
  await TestValidator.error("cannot update cart item to quantity 0")(() =>
    api.functional.aimall_backend.administrator.carts.cartItems.update(
      connection,
      {
        cartId: cart.id,
        cartItemId: cartItem.id,
        body: {
          quantity: 0,
          updated_at: new Date().toISOString(),
        } satisfies IAimallBackendCartItem.IUpdate,
      },
    ),
  );
}
