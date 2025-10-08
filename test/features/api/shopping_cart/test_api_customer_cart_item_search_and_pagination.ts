import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCartItem";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";

/**
 * Validate searching and paginating a customer's cart items.
 *
 * 1. Register a new customer (with address)
 * 2. Create a shopping cart for the customer
 * 3. Retrieve and search the cart items (should be empty)
 * 4. Search/paginate with random filters (should be empty)
 * 5. Use unauthorized connection (should fail or return nothing)
 * 6. Attempt paginated searches with various page/limit
 * 7. Assert empty results, correct shape, and no access leaks
 */
export async function test_api_customer_cart_item_search_and_pagination(
  connection: api.IConnection,
) {
  // 1. Customer registration (join)
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    address: {
      recipient_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      region: RandomGenerator.paragraph({ sentences: 1 }),
      postal_code: RandomGenerator.alphaNumeric(5),
      address_line1: RandomGenerator.paragraph({ sentences: 2 }),
      address_line2: null,
      is_default: true,
    },
  } satisfies IShoppingMallCustomer.IJoin;
  const customer = await api.functional.auth.customer.join(connection, {
    body: customerJoinBody,
  });
  typia.assert(customer);

  // 2. Create new shopping cart (must authenticate as customer already)
  const cart = await api.functional.shoppingMall.customer.carts.create(
    connection,
    {
      body: {},
    },
  );
  typia.assert(cart);
  // There should be no cart items right after creation
  TestValidator.equals(
    "cart cart_items is empty or undefined",
    cart.cart_items ?? [],
    [],
  );

  // 3. Query cart items - default (no filter) - should return empty page
  const emptyItemsRes = await api.functional.shoppingMall.customer.carts.index(
    connection,
    {
      body: {},
    },
  );
  typia.assert(emptyItemsRes);
  TestValidator.equals(
    "empty cart returns empty data array",
    emptyItemsRes.data,
    [],
  );

  // 4. Query with specific cartId - should still be empty
  const byCartIdRes = await api.functional.shoppingMall.customer.carts.index(
    connection,
    {
      body: { cartId: cart.id },
    },
  );
  typia.assert(byCartIdRes);
  TestValidator.equals("by cartId - empty", byCartIdRes.data, []);

  // 5. Query with random filters (none should match anything, should stay empty)
  const filteredRes = await api.functional.shoppingMall.customer.carts.index(
    connection,
    {
      body: {
        cartId: cart.id,
        productId: typia.random<string & tags.Format<"uuid">>(),
        skuId: typia.random<string & tags.Format<"uuid">>(),
        search: RandomGenerator.paragraph({ sentences: 1 }),
        sort: RandomGenerator.pick([
          "added_desc",
          "added_asc",
          "name_asc",
          "name_desc",
          "price_asc",
          "price_desc",
        ] as const),
        page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 10 as number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
      },
    },
  );
  typia.assert(filteredRes);
  TestValidator.equals("filtered - empty", filteredRes.data, []);

  // 6. Test pagination boundaries (page/limit exceeding data count)
  const bigPageRes = await api.functional.shoppingMall.customer.carts.index(
    connection,
    {
      body: {
        cartId: cart.id,
        page: 99 as number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 100,
      },
    },
  );
  typia.assert(bigPageRes);
  TestValidator.equals("big page - empty", bigPageRes.data, []);
  TestValidator.equals(
    "pagination current as requested",
    bigPageRes.pagination.current,
    99,
  );
  TestValidator.equals(
    "pagination limit as requested",
    bigPageRes.pagination.limit,
    100,
  );

  // 7. Unauthorized/unauthenticated: clone connection and remove token
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated cannot access cart index",
    async () => {
      await api.functional.shoppingMall.customer.carts.index(unauthConn, {
        body: {},
      });
    },
  );
}
