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
 * Validate fetching all cart items for a customer cart with multiple products.
 *
 * This test covers:
 *
 * 1. Register a customer using the customer creation endpoint (unique
 *    email/phone).
 * 2. Create a shopping cart owned by this customer via the cart creation endpoint.
 * 3. Add multiple distinct product items via the cart item creation endpoint—each
 *    with a different fake product UUID, quantity, and pricing.
 * 4. Retrieve all items in the cart with the GET endpoint.
 * 5. Validate that all added items are present and their fields (productId,
 *    quantity, unit_price) match exactly.
 * 6. Edge case: Also verify that a newly created empty cart returns an empty
 *    cartItems array.
 *
 * Business Rationale: Ensures a customer can view only their own cart's
 * contents in detail, and that all relevant item fields are correctly persisted
 * and enumerated. Also validates correct empty behavior and rejects accidental
 * cross-cart contamination.
 */
export async function test_api_aimall_backend_customer_carts_cartItems_test_get_cart_items_for_customer_cart_with_multiple_items(
  connection: api.IConnection,
) {
  // 1. Register a new customer
  const email = typia.random<string & tags.Format<"email">>();
  const phone = RandomGenerator.mobile();
  const customer = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: {
        email,
        phone,
        status: "active",
        password_hash: null,
      },
    },
  );
  typia.assert(customer);

  // 2. Create a cart for this customer
  const cart = await api.functional.aimall_backend.customer.carts.create(
    connection,
    {
      body: {
        aimall_backend_customer_id: customer.id,
      },
    },
  );
  typia.assert(cart);

  // 3. Add multiple cart items (simulate 3 different products with unique IDs)
  const productItemInputs = ArrayUtil.repeat(3)(
    () =>
      ({
        aimall_backend_product_id: typia.random<string & tags.Format<"uuid">>(),
        quantity: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
        >(),
        unit_price_snapshot: typia.random<
          number & tags.Minimum<100> & tags.Maximum<100000>
        >(),
        discount_snapshot: 0,
        selected_name_display: RandomGenerator.alphabets(8),
      }) satisfies IAimallBackendCartItem.ICreate,
  );
  const createdItems: IAimallBackendCartItem[] = [];
  for (const input of productItemInputs) {
    const result =
      await api.functional.aimall_backend.customer.carts.cartItems.create(
        connection,
        {
          cartId: cart.id,
          body: input,
        },
      );
    typia.assert(result);
    createdItems.push(result);
  }

  // 4. Fetch all items from the cart
  const fetched =
    await api.functional.aimall_backend.customer.carts.cartItems.index(
      connection,
      {
        cartId: cart.id,
      },
    );
  typia.assert(fetched);
  TestValidator.equals("cart item count matches")(fetched.data.length)(
    createdItems.length,
  );

  // 5. For each product, verify fields match by product_id
  const getCreatedItem = (productId: string) =>
    createdItems.find((it) => it.aimall_backend_product_id === productId);
  for (const item of fetched.data) {
    const match = getCreatedItem(item.aimall_backend_product_id);
    if (!match)
      throw new Error(
        `Fetched product_id ${item.aimall_backend_product_id} not found among created items.`,
      );
    TestValidator.equals("product_id matches")(item.aimall_backend_product_id)(
      match.aimall_backend_product_id,
    );
    TestValidator.equals("quantity matches")(item.quantity)(match.quantity);
    TestValidator.equals("unit_price_snapshot matches")(
      item.unit_price_snapshot,
    )(match.unit_price_snapshot);
    TestValidator.equals("discount_snapshot matches")(
      item.discount_snapshot ?? 0,
    )(match.discount_snapshot ?? 0);
    TestValidator.equals("selected_name_display matches")(
      item.selected_name_display ?? "",
    )(match.selected_name_display ?? "");
  }

  // 6. Edge case: ensure an empty cart yields no items
  const emptyCart = await api.functional.aimall_backend.customer.carts.create(
    connection,
    {
      body: {
        aimall_backend_customer_id: customer.id,
      },
    },
  );
  typia.assert(emptyCart);
  const emptyItems =
    await api.functional.aimall_backend.customer.carts.cartItems.index(
      connection,
      {
        cartId: emptyCart.id,
      },
    );
  typia.assert(emptyItems);
  TestValidator.equals("empty cart returns empty list")(emptyItems.data.length)(
    0,
  );
}
