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
 * Validate administrator's advanced filtered and paginated search of cart items
 * in any cart.
 *
 * Simulates a workflow from customer onboarding to cart item creation with
 * varied attributes, then validates admin filtered/paginated queries:
 *
 * 1. Create a new customer (unique email/phone for isolation).
 * 2. Create a cart for this customer.
 * 3. Add several (e.g. 3+) distinct cart items, each with different product, SKU,
 *    and timestamps.
 * 4. As admin, perform multiple queries on this cart:
 *
 *    - By product ID
 *    - By SKU (where relevant)
 *    - By creation time window
 *    - Use limit/page to trigger pagination
 * 5. Assert that filtered results and pagination metadata match expectation.
 *
 * Business goal: Confirm administrator can audit/search any cart with precision
 * using all advanced filters the endpoint provides.
 */
export async function test_api_aimall_backend_administrator_carts_cartItems_test_admin_cart_items_advanced_search_and_pagination(
  connection: api.IConnection,
) {
  // Step 1: Create a customer
  const customerEmail = `${RandomGenerator.alphabets(8)}@test.com`;
  const customerPhone = `010${typia.random<string>().slice(0, 8)}`;
  const customer = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: {
        email: customerEmail,
        phone: customerPhone,
        password_hash: null,
        status: "active",
      },
    },
  );
  typia.assert(customer);

  // Step 2: Create a cart for the customer
  const cart = await api.functional.aimall_backend.customer.carts.create(
    connection,
    {
      body: {
        aimall_backend_customer_id: customer.id,
      },
    },
  );
  typia.assert(cart);

  // Step 3: Add several cart items (at least 3 with different products/SKUs/timestamps)
  const now = new Date();
  const products = [
    typia.random<string & tags.Format<"uuid">>(),
    typia.random<string & tags.Format<"uuid">>(),
    typia.random<string & tags.Format<"uuid">>(),
  ];
  const skus = [
    typia.random<string & tags.Format<"uuid">>(),
    typia.random<string & tags.Format<"uuid">>(),
    null,
  ];
  const basePrice = Math.floor(Math.random() * 10000) + 1000;

  const cartItems = [] as IAimallBackendCartItem[];
  for (let i = 0; i < 3; i++) {
    const item =
      await api.functional.aimall_backend.customer.carts.cartItems.create(
        connection,
        {
          cartId: cart.id,
          body: {
            aimall_backend_product_id: products[i],
            aimall_backend_product_option_id: null,
            aimall_backend_sku_id: skus[i],
            quantity: 1 + i,
            unit_price_snapshot: basePrice + i * 100,
            discount_snapshot: null,
            selected_name_display: `product_${i}`,
          },
        },
      );
    typia.assert(item);
    cartItems.push(item);
  }

  // Wait to ensure timestamps differ if testing created_at_from/to accurately
  await new Promise((res) => setTimeout(res, 1200));

  // Step 4a: Admin queries by product ID
  const searchByProduct =
    await api.functional.aimall_backend.administrator.carts.cartItems.search(
      connection,
      {
        cartId: cart.id,
        body: {
          aimall_backend_product_id: products[1],
          limit: 10,
          page: 1,
        },
      },
    );
  typia.assert(searchByProduct);
  TestValidator.equals("product filter count")(searchByProduct.data.length)(1);
  TestValidator.equals("product filter id")(
    searchByProduct.data[0].aimall_backend_product_id,
  )(products[1]);
  TestValidator.equals("pagination meta (product)")(
    searchByProduct.pagination.records,
  )(1);
  TestValidator.equals("page count meta (product)")(
    searchByProduct.pagination.pages,
  )(1);

  // Step 4b: Admin queries by SKU (where present)
  if (skus[0]) {
    const searchBySku =
      await api.functional.aimall_backend.administrator.carts.cartItems.search(
        connection,
        {
          cartId: cart.id,
          body: {
            aimall_backend_sku_id: skus[0],
            limit: 10,
            page: 1,
          },
        },
      );
    typia.assert(searchBySku);
    TestValidator.equals("sku filter count")(searchBySku.data.length)(1);
    TestValidator.equals("sku filter id")(
      searchBySku.data[0].aimall_backend_sku_id,
    )(skus[0]);
    TestValidator.equals("pagination meta (sku)")(
      searchBySku.pagination.records,
    )(1);
  }

  // Step 4c: Admin queries by created_at range
  const time0 = cartItems[0].created_at;
  const time2 = cartItems[2].created_at;
  const searchByTime =
    await api.functional.aimall_backend.administrator.carts.cartItems.search(
      connection,
      {
        cartId: cart.id,
        body: {
          created_at_from: time0,
          created_at_to: time2,
          limit: 10,
          page: 1,
        },
      },
    );
  typia.assert(searchByTime);
  // Ensure all found items are within the requested date range
  for (const found of searchByTime.data) {
    TestValidator.predicate("found created_in_range")(
      found.created_at >= time0 && found.created_at <= time2,
    );
  }

  // Step 4d: Admin queries with pagination limit 2, get page 1, then page 2
  const paged1 =
    await api.functional.aimall_backend.administrator.carts.cartItems.search(
      connection,
      {
        cartId: cart.id,
        body: {
          limit: 2,
          page: 1,
        },
      },
    );
  typia.assert(paged1);
  TestValidator.equals("pagination limit1")(paged1.pagination.limit)(2);

  const paged2 =
    await api.functional.aimall_backend.administrator.carts.cartItems.search(
      connection,
      {
        cartId: cart.id,
        body: {
          limit: 2,
          page: 2,
        },
      },
    );
  typia.assert(paged2);
  // Check pagination reflects total records, page, etc
  TestValidator.equals("records match sum")(paged1.pagination.records)(3);
  TestValidator.equals("records match sum")(paged2.pagination.records)(3);
  TestValidator.equals("page2 length")(paged2.data.length)(1);
}
