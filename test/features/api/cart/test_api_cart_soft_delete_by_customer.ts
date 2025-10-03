import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

/**
 * Validate the soft deletion (logical delete) of a shopping cart by an
 * authenticated customer.
 *
 * Steps:
 *
 * 1. Register a new customer (join) and authenticate the session.
 * 2. Create a new cart belonging to the customer, ensuring unique channel/section
 *    IDs.
 * 3. Soft delete the cart as the cart's owner; expect operation to succeed.
 * 4. Confirm that the cart is no longer active (e.g., by direct attempt to delete
 *    again, which should fail, or by inspecting the 'deleted_at' flag if
 *    retrieval is permitted).
 * 5. Test deletion attempt by a different customer; should fail (permission denial
 *    or not found).
 * 6. Attempt deletion of a non-existent cartId; must fail.
 * 7. Confirm that cart data (where retrievable) is marked deleted and not
 *    physically removed.
 */
export async function test_api_cart_soft_delete_by_customer(
  connection: api.IConnection,
) {
  // Step 1: Register the customer
  const channelId = typia.random<string & tags.Format<"uuid">>();
  const sectionId = typia.random<string & tags.Format<"uuid">>();
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        shopping_mall_channel_id: channelId,
        email: customerEmail,
        name: RandomGenerator.name(),
        password: RandomGenerator.alphaNumeric(12),
        phone: RandomGenerator.mobile(),
      } satisfies IShoppingMallCustomer.IJoin,
    });
  typia.assert(customer);

  // Step 2: Create a cart for the registered customer
  const cart: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.create(connection, {
      body: {
        shopping_mall_customer_id: customer.id,
        shopping_mall_channel_id: channelId,
        shopping_mall_section_id: sectionId,
        source: "member", // common source value
      } satisfies IShoppingMallCart.ICreate,
    });
  typia.assert(cart);
  TestValidator.equals(
    "cart belongs to the customer",
    cart.shopping_mall_customer_id,
    customer.id,
  );

  // Step 3: Delete the cart (soft delete)
  await api.functional.shoppingMall.customer.carts.erase(connection, {
    cartId: cart.id,
  });

  // (Optional) If there were an API to read the cart, verify deleted_at is not null.
  // Since no cart-get/read endpoint is documented, we cannot perform this check directly.

  // Step 4: Attempt redundant delete (should error)
  await TestValidator.error(
    "cannot delete an already deleted cart",
    async () => {
      await api.functional.shoppingMall.customer.carts.erase(connection, {
        cartId: cart.id,
      });
    },
  );

  // Step 5: Register a different customer and create another cart
  const otherChannelId = typia.random<string & tags.Format<"uuid">>();
  const otherSectionId = typia.random<string & tags.Format<"uuid">>();
  const otherCustomerEmail = typia.random<string & tags.Format<"email">>();
  const otherCustomer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        shopping_mall_channel_id: otherChannelId,
        email: otherCustomerEmail,
        name: RandomGenerator.name(),
        password: RandomGenerator.alphaNumeric(12),
        phone: RandomGenerator.mobile(),
      } satisfies IShoppingMallCustomer.IJoin,
    });
  typia.assert(otherCustomer);

  const otherCart: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.create(connection, {
      body: {
        shopping_mall_customer_id: otherCustomer.id,
        shopping_mall_channel_id: otherChannelId,
        shopping_mall_section_id: otherSectionId,
        source: "member",
      } satisfies IShoppingMallCart.ICreate,
    });
  typia.assert(otherCart);

  // Still authenticated as first customer: try deleting someone else's cart
  await TestValidator.error(
    "customer cannot delete another user's cart",
    async () => {
      await api.functional.shoppingMall.customer.carts.erase(connection, {
        cartId: otherCart.id,
      });
    },
  );

  // Step 6: Attempt delete with random non-existent cartId
  const randomFakeCartId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("cannot delete non-existent cart", async () => {
    await api.functional.shoppingMall.customer.carts.erase(connection, {
      cartId: randomFakeCartId,
    });
  });
}
