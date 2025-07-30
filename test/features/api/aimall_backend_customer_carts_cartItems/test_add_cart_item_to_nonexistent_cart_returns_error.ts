import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAimallBackendCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCartItem";

/**
 * Validate error handling when attempting to add an item to a non-existent
 * cart.
 *
 * This test targets the POST /aimall-backend/customer/carts/{cartId}/cartItems
 * endpoint. It ensures the system correctly rejects and reports errors when a
 * client attempts to add a cart item with an invalid (non-existing) cartId.
 *
 * Steps:
 *
 * 1. Register a new customer using the customers API to set up user context (no
 *    cart will be created for this customer).
 * 2. Attempt to add a cart item using a random, likely-nonexistent cartId and a
 *    valid body payload per IAimallBackendCartItem.ICreate (valid random
 *    product/etc IDs, as actual cart presence is the error focus).
 * 3. Assert that the API call results in an error (such as 404 Not Found or
 *    equivalent), confirming correct handling of invalid cart context and that
 *    no cart item is created for that cartId.
 * 4. Optionally, validate the error type (e.g., HttpError thrown or error code is
 *    present), but do not rely on specific error messages or error content
 *    beyond the fact that it is an error.
 */
export async function test_api_aimall_backend_customer_carts_cartItems_test_add_cart_item_to_nonexistent_cart_returns_error(
  connection: api.IConnection,
) {
  // 1. Create a customer (setup dependency)
  const customer = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        phone: RandomGenerator.mobile(),
        password_hash: null,
        status: "active",
      } satisfies IAimallBackendCustomer.ICreate,
    },
  );
  typia.assert(customer);

  // 2. Prepare a random cartId that almost certainly does not exist
  const randomCartId = typia.random<string & tags.Format<"uuid">>();

  // 3. Prepare a valid cart item create payload (product etc IDs can be random as cart is the focus)
  const cartItemBody: IAimallBackendCartItem.ICreate = {
    aimall_backend_product_id: typia.random<string & tags.Format<"uuid">>(),
    aimall_backend_product_option_id: null,
    aimall_backend_sku_id: null,
    quantity: 1,
    unit_price_snapshot: 10000,
    discount_snapshot: null,
    selected_name_display: null,
  };

  // 4. Try to create a cart item in the non-existent cart and confirm error
  await TestValidator.error("adding item to nonexistent cart fails")(
    async () => {
      await api.functional.aimall_backend.customer.carts.cartItems.create(
        connection,
        {
          cartId: randomCartId,
          body: cartItemBody,
        },
      );
    },
  );
}
