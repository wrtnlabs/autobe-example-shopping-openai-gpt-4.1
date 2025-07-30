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
 * Verify that retrieving cart items from a newly created, empty shopping cart
 * returns an empty list.
 *
 * Business context: Customers start with an empty cart, and the API should
 * accurately reflect this state. It is critical for downstream user experience
 * and UI logic that carts with no items show an empty items array and have
 * accurate pagination info (zero records, zero pages).
 *
 * Steps:
 *
 * 1. Register a new customer (with unique email and phone).
 * 2. Create a shopping cart for that customer, capturing the generated cartId.
 * 3. Immediately query /aimall-backend/customer/carts/{cartId}/cartItems for that
 *    cart.
 * 4. Assert that the returned data array is empty ([]), records count is 0, and
 *    pagination structure is valid.
 */
export async function test_api_aimall_backend_customer_carts_cartItems_test_get_cart_items_empty_cart_returns_empty_list(
  connection: api.IConnection,
) {
  // 1. Register a new customer
  const uniqueEmail = typia.random<string & tags.Format<"email">>();
  const uniquePhone = RandomGenerator.mobile();
  const customer = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: {
        email: uniqueEmail,
        phone: uniquePhone,
        status: "active",
        password_hash: "secure_dummy_hash",
      } satisfies IAimallBackendCustomer.ICreate,
    },
  );
  typia.assert(customer);

  // 2. Create a shopping cart tied to this customer
  const cart = await api.functional.aimall_backend.customer.carts.create(
    connection,
    {
      body: {
        aimall_backend_customer_id: customer.id,
      } satisfies IAimallBackendCart.ICreate,
    },
  );
  typia.assert(cart);

  // 3. Query the cart's items list (should be empty)
  const itemsPage =
    await api.functional.aimall_backend.customer.carts.cartItems.index(
      connection,
      {
        cartId: cart.id,
      },
    );
  typia.assert(itemsPage);

  // 4. Assert business logic: data should be empty, records 0, pages 0 or 1, structure valid
  TestValidator.equals("no cart items yet")(itemsPage.data)([]);
  TestValidator.equals("zero records")(itemsPage.pagination.records)(0);
  TestValidator.predicate("pages should be at least zero")(
    itemsPage.pagination.pages >= 0,
  );
}
