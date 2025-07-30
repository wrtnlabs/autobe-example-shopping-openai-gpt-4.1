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
 * E2E test for filtered and paginated search of cart items within a customer's
 * own cart.
 *
 * This test verifies that after adding multiple items to a user's cart, the
 * search (PATCH) endpoint correctly supports:
 *
 * - Filtering cart items by atomic attributes (product_id, etc.)
 * - Pagination parameters (limit/page) and response metadata
 * - Returns only items matching the applied filter
 * - Pagination info reflects actual filtered total
 *
 * Step-by-step:
 *
 * 1. Register a new customer
 * 2. Create a cart for this customer
 * 3. Add several (5+) items to the cart using varied product IDs
 * 4. Search with a filter for a specific product_id, check results only include
 *    that product, validate pagination
 * 5. Search without product filter but with limit/page, ensure correct slice and
 *    pagination info
 */
export async function test_api_aimall_backend_customer_carts_cartItems_test_customer_cart_items_search_with_filters_and_pagination(
  connection: api.IConnection,
) {
  // 1. Register new customer
  const customerEmail = RandomGenerator.alphaNumeric(10) + "@test.com";
  const customerPhone = "010" + typia.random<string>().slice(0, 8);
  const customer = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: {
        email: customerEmail,
        phone: customerPhone,
        status: "active",
        password_hash: null,
      } satisfies IAimallBackendCustomer.ICreate,
    },
  );
  typia.assert(customer);

  // 2. Create a cart for the new customer
  const cart = await api.functional.aimall_backend.customer.carts.create(
    connection,
    {
      body: {
        aimall_backend_customer_id: customer.id,
      } satisfies IAimallBackendCart.ICreate,
    },
  );
  typia.assert(cart);

  // 3. Add 6 items (with 3 unique product IDs, 2 per product) to the cart
  const productIds = ArrayUtil.repeat(3)(() =>
    typia.random<string & tags.Format<"uuid">>(),
  );
  const createdItems: IAimallBackendCartItem[] = [];
  for (let i = 0; i < 6; ++i) {
    const prodIdx = Math.floor(i / 2); // 2 items per product
    const item =
      await api.functional.aimall_backend.customer.carts.cartItems.create(
        connection,
        {
          cartId: cart.id,
          body: {
            aimall_backend_product_id: productIds[prodIdx],
            quantity: 1,
            unit_price_snapshot: 10000 + i * 10,
            aimall_backend_product_option_id: null,
            aimall_backend_sku_id: null,
            discount_snapshot: null,
            selected_name_display: `Test Product #${prodIdx + 1}`,
          } satisfies IAimallBackendCartItem.ICreate,
        },
      );
    typia.assert(item);
    createdItems.push(item);
  }

  // 4. Search with a filter for 1 specific product_id (should return 2 items)
  const targetProductId = productIds[1];
  const searchFiltered =
    await api.functional.aimall_backend.customer.carts.cartItems.search(
      connection,
      {
        cartId: cart.id,
        body: {
          aimall_backend_product_id: targetProductId,
          limit: 10,
          page: 1,
        } satisfies IAimallBackendCartItem.IRequest,
      },
    );
  typia.assert(searchFiltered);
  // All items returned should have that product_id
  for (const item of searchFiltered.data) {
    TestValidator.equals("filtered product_id match")(
      item.aimall_backend_product_id,
    )(targetProductId);
    TestValidator.equals("cart id match")(item.aimall_backend_cart_id)(cart.id);
  }
  TestValidator.equals("total filtered items count")(
    searchFiltered.pagination.records,
  )(2);

  // 5. Search with pagination (limit=3, page=2), no filter
  const searchPaginated =
    await api.functional.aimall_backend.customer.carts.cartItems.search(
      connection,
      {
        cartId: cart.id,
        body: {
          limit: 3,
          page: 2,
        } satisfies IAimallBackendCartItem.IRequest,
      },
    );
  typia.assert(searchPaginated);
  TestValidator.equals("page slice length")(searchPaginated.data.length)(3);
  TestValidator.equals("pagination page")(searchPaginated.pagination.current)(
    2,
  );
  TestValidator.equals("pagination limit")(searchPaginated.pagination.limit)(3);
  TestValidator.equals("pagination total count")(
    searchPaginated.pagination.records,
  )(6);
}
