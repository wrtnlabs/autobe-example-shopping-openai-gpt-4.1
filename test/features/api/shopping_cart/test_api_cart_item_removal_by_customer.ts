import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";

/**
 * Validates that only an authenticated customer can remove items from their own
 * shopping cart using the cart item removal API endpoint. This test simulates
 * two customers: Customer A (cart owner) and Customer B (non-owner). Steps:
 *
 * 1. Customer A completes registration (join) and receives authentication context.
 * 2. Simulate that Customer A has a cart and a cart item (generate random UUIDs
 *    for both).
 * 3. Customer A attempts to remove their cart item from their own cart. Expects:
 *    success (no error).
 * 4. Customer B completes registration (join) and receives a distinct
 *    authentication context.
 * 5. Customer B attempts to remove Customer A's cart item from Customer A's cart.
 *    Expects: error (forbidden/authz denied).
 *
 * Note: As there are no accessible APIs for creating/querying cart or cart
 * items, we simulate these resources with random UUIDs for the purpose of
 * permission enforcement validation.
 */
export async function test_api_cart_item_removal_by_customer(
  connection: api.IConnection,
) {
  // Step 1: Register Customer A and authenticate
  const customerA = await api.functional.auth.customer.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      full_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      address: {
        recipient_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        region: RandomGenerator.paragraph({ sentences: 2 }),
        postal_code: RandomGenerator.alphaNumeric(5),
        address_line1: RandomGenerator.paragraph({ sentences: 2 }),
        is_default: true,
      },
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerA);

  // Step 2: Simulate cart and cart item creation for Customer A
  const cartId = typia.random<string & tags.Format<"uuid">>();
  const cartItemId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Customer A removes their own cart item (should succeed)
  await api.functional.shoppingMall.customer.carts.cartItems.erase(connection, {
    cartId,
    cartItemId,
  });

  // Step 4: Register Customer B and authenticate
  const customerB = await api.functional.auth.customer.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      full_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      address: {
        recipient_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        region: RandomGenerator.paragraph({ sentences: 2 }),
        postal_code: RandomGenerator.alphaNumeric(5),
        address_line1: RandomGenerator.paragraph({ sentences: 2 }),
        is_default: true,
      },
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerB);

  // Step 5: Customer B attempts to remove Customer A's cart item (should fail)
  await TestValidator.error("only cart owner can remove item", async () => {
    await api.functional.shoppingMall.customer.carts.cartItems.erase(
      connection,
      {
        cartId,
        cartItemId,
      },
    );
  });
}
