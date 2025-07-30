import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAimallBackendCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCart";
import type { IAimallBackendCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCartItem";

/**
 * Validate that an administrator can add a cart item to any cart.
 *
 * Business context: This test ensures that the administrator has the authority
 * to add items to carts for any customer, regardless of cart ownership. The
 * workflow covers the creation of a new customer, the provisioning of a new
 * cart for that customer, and finally the administrative action of inserting a
 * cart item.
 *
 * Step-by-step process:
 *
 * 1. Create a new customer (to provision a unique cart owner).
 * 2. Create a cart for the new customer.
 * 3. As an administrator, add an item to the newly created cart, referencing valid
 *    product, quantity, and price values.
 * 4. Assert that the response includes correct associations; specifically, confirm
 *    that the cart item references the intended cartId and productId, and that
 *    numeric values for quantity and unit price match what was submitted.
 */
export async function test_api_aimall_backend_administrator_carts_cartItems_test_admin_add_cart_item_to_any_cart(
  connection: api.IConnection,
) {
  // Step 1: Create a customer
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

  // Step 2: Create a cart for this customer
  const cart = await api.functional.aimall_backend.customer.carts.create(
    connection,
    {
      body: {
        aimall_backend_customer_id: customer.id,
      } satisfies IAimallBackendCart.ICreate,
    },
  );
  typia.assert(cart);

  // Step 3: As admin, add a cart item to the customer cart
  // Since we do not have product administration endpoints defined in the test context,
  // use random UUIDs as placeholders for product/option/sku references.
  const productId = typia.random<string & tags.Format<"uuid">>();
  const optionId = typia.random<string & tags.Format<"uuid">>();
  const skuId = typia.random<string & tags.Format<"uuid">>();
  const quantity = 2;
  const unitPrice = 19900;
  const discount = 3000;
  const itemLabel = "Premium Sneakers / Blue / 270mm";
  const cartItem =
    await api.functional.aimall_backend.administrator.carts.cartItems.create(
      connection,
      {
        cartId: cart.id,
        body: {
          aimall_backend_product_id: productId,
          aimall_backend_product_option_id: optionId,
          aimall_backend_sku_id: skuId,
          quantity: quantity,
          unit_price_snapshot: unitPrice,
          discount_snapshot: discount,
          selected_name_display: itemLabel,
        } satisfies IAimallBackendCartItem.ICreate,
      },
    );
  typia.assert(cartItem);

  // Step 4: Validate associations
  TestValidator.equals("cart association")(cartItem.aimall_backend_cart_id)(
    cart.id,
  );
  TestValidator.equals("product association")(
    cartItem.aimall_backend_product_id,
  )(productId);
  TestValidator.equals("option association")(
    cartItem.aimall_backend_product_option_id,
  )(optionId);
  TestValidator.equals("sku association")(cartItem.aimall_backend_sku_id)(
    skuId,
  );
  TestValidator.equals("quantity")(cartItem.quantity)(quantity);
  TestValidator.equals("price")(cartItem.unit_price_snapshot)(unitPrice);
  TestValidator.equals("discount")(cartItem.discount_snapshot)(discount);
  TestValidator.equals("label")(cartItem.selected_name_display)(itemLabel);
}
