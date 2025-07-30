import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAimallBackendCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCart";
import type { IAimallBackendCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCartItem";
import type { IPageIAimallBackendCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendCartItem";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Test searching for cart items with a filter that yields no results.
 *
 * This test covers the negative case for cart item paginated search in a given
 * cart. It ensures that when a filter is provided, such as a non-existent
 * product ID, the API returns an empty data list and correct pagination
 * metadata, rather than erroring or returning results inappropriately.
 *
 * Steps:
 *
 * 1. Create a test customer account in the system.
 * 2. Create a cart associated with this test customer.
 * 3. Add one or more cart items to that cart (with random but valid
 *    product-IDs/SKUs/randomized data).
 * 4. Perform a PATCH search on that cart, filtering by a product ID that does not
 *    exist among the added items (generate a random UUID that will not match
 *    any previously inserted product IDs).
 * 5. Assert that the returned data array is empty.
 * 6. Assert that pagination metadata is present and correct (page should be 1,
 *    records 0 or equal, pages 0 or 1, etc).
 */
export async function test_api_aimall_backend_customer_carts_cartItems_test_cart_items_search_returns_empty_when_filter_no_results(
  connection: api.IConnection,
) {
  // 1. Create a test customer
  const customer = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        phone: typia.random<string>(),
        password_hash: null,
        status: "active",
      } satisfies IAimallBackendCustomer.ICreate,
    },
  );
  typia.assert(customer);

  // 2. Create a cart for the customer
  const cart = await api.functional.aimall_backend.customer.carts.create(
    connection,
    {
      body: {
        aimall_backend_customer_id: customer.id,
      } satisfies IAimallBackendCart.ICreate,
    },
  );
  typia.assert(cart);

  // 3. Add sample cart items (at least 1) to this cart
  const productIdInCart = typia.random<string & tags.Format<"uuid">>();
  const item =
    await api.functional.aimall_backend.customer.carts.cartItems.create(
      connection,
      {
        cartId: cart.id,
        body: {
          aimall_backend_product_id: productIdInCart,
          aimall_backend_product_option_id: null,
          aimall_backend_sku_id: null,
          quantity: 2,
          unit_price_snapshot: 10000,
        } satisfies IAimallBackendCartItem.ICreate,
      },
    );
  typia.assert(item);

  // 4. Search for cart items with a random non-matching product ID
  let nonExistentProductId: string & tags.Format<"uuid">;
  do {
    nonExistentProductId = typia.random<string & tags.Format<"uuid">>();
  } while (nonExistentProductId === productIdInCart);

  const page =
    await api.functional.aimall_backend.customer.carts.cartItems.search(
      connection,
      {
        cartId: cart.id,
        body: {
          aimall_backend_product_id: nonExistentProductId,
          limit: 10,
          page: 1,
        } satisfies IAimallBackendCartItem.IRequest,
      },
    );
  typia.assert(page);
  TestValidator.equals("data is empty")(page.data)([]);
  TestValidator.equals("pagination current page")(page.pagination.current)(1);
  TestValidator.equals("pagination records")(page.pagination.records)(0);
}
