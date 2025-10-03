import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

/**
 * Verify that cart ownership is enforced: unauthorized customer cannot update
 * another customer's cart.
 *
 * Business context: Customers must not be able to update carts other than their
 * own. This upholds account isolation and data security. Attempting to update
 * another user's cart should result in a runtime authorization error (e.g., 403
 * or equivalent).
 *
 * Steps:
 *
 * 1. Register Customer A (joined to specified channel)
 * 2. Register Customer B (joined to same channel for test simplicity)
 * 3. Customer A creates a cart (capture all required info: customer, channel,
 *    section, source)
 * 4. Customer B (after switching authentication/session) attempts to update A's
 *    cart (tries to e.g. change section or status)
 * 5. Assert that the update is rejected as an authorization error using
 *    TestValidator.error
 */
export async function test_api_customer_cart_update_unauthorized(
  connection: api.IConnection,
) {
  // Step 1: Register customer A and obtain info
  const channelId = typia.random<string & tags.Format<"uuid">>();
  const sectionId = typia.random<string & tags.Format<"uuid">>();
  const custA = await api.functional.auth.customer.join(connection, {
    body: {
      shopping_mall_channel_id: channelId,
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(10),
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(custA);
  // Step 2: Register customer B (same channel)
  const custB = await api.functional.auth.customer.join(connection, {
    body: {
      shopping_mall_channel_id: channelId,
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(10),
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(custB);
  // Step 3: Re-authenticate as customer A (ensure A's session)
  await api.functional.auth.customer.join(connection, {
    body: {
      shopping_mall_channel_id: channelId,
      email: custA.email,
      password: custA.token.access,
      name: custA.name,
      phone: custA.phone ?? RandomGenerator.mobile(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  // Step 4: Customer A creates cart
  const cart = await api.functional.shoppingMall.customer.carts.create(
    connection,
    {
      body: {
        shopping_mall_customer_id: custA.id,
        shopping_mall_channel_id: channelId,
        shopping_mall_section_id: sectionId,
        source: "member",
      } satisfies IShoppingMallCart.ICreate,
    },
  );
  typia.assert(cart);
  // Step 5: Switch to customer B session
  await api.functional.auth.customer.join(connection, {
    body: {
      shopping_mall_channel_id: channelId,
      email: custB.email,
      password: custB.token.access,
      name: custB.name,
      phone: custB.phone ?? RandomGenerator.mobile(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  // Step 6: Customer B attempts to update Cart A (should fail)
  await TestValidator.error(
    "customer cannot update another user's cart",
    async () => {
      await api.functional.shoppingMall.customer.carts.update(connection, {
        cartId: cart.id,
        body: {
          status: "expired",
        } satisfies IShoppingMallCart.IUpdate,
      });
    },
  );
}
