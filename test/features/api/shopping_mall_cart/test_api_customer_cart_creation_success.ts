import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

/**
 * Validate that a new customer can join and create a shopping cart with valid
 * channel and section.
 *
 * 1. Register a new customer account with unique/random channel, email, name
 *    (phone optional).
 * 2. Use the returned identifiers to create a new customer cart specifying
 *    customer/channel/section/source values.
 * 3. Assert cart fields match initial values/set relationships, verify the cart is
 *    not deleted, and that audit and status fields are valid.
 */
export async function test_api_customer_cart_creation_success(
  connection: api.IConnection,
) {
  // 1. Generate random channel/section UUIDs for this test
  const channelId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const sectionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 2. Register a fresh customer for this channel
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const name: string & tags.MaxLength<64> = RandomGenerator.name();
  const password: string & tags.MinLength<6> & tags.MaxLength<128> =
    RandomGenerator.alphaNumeric(10);
  const joinBody = {
    shopping_mall_channel_id: channelId,
    email,
    password,
    name,
  } satisfies IShoppingMallCustomer.IJoin;
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, { body: joinBody });
  typia.assert(customer);
  TestValidator.equals(
    "customer's channel matches input",
    customer.shopping_mall_channel_id,
    channelId,
  );
  TestValidator.equals("customer's email matches input", customer.email, email);

  // 3. Create a cart as this customer for the selected channel/section
  const cartBody = {
    shopping_mall_customer_id: customer.id,
    shopping_mall_channel_id: customer.shopping_mall_channel_id,
    shopping_mall_section_id: sectionId,
    source: "member",
  } satisfies IShoppingMallCart.ICreate;
  const cart: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.create(connection, {
      body: cartBody,
    });
  typia.assert(cart);
  TestValidator.equals(
    "cart.customer_id",
    cart.shopping_mall_customer_id,
    customer.id,
  );
  TestValidator.equals(
    "cart.channel_id",
    cart.shopping_mall_channel_id,
    customer.shopping_mall_channel_id,
  );
  TestValidator.equals(
    "cart.section_id",
    cart.shopping_mall_section_id,
    sectionId,
  );
  TestValidator.equals("cart source is member", cart.source, "member");
  TestValidator.equals(
    "cart is active or initial state",
    cart.status,
    "active",
  );
  TestValidator.equals("cart not deleted", cart.deleted_at, null);
  TestValidator.predicate(
    "cart created_at defined",
    typeof cart.created_at === "string" && cart.created_at.length > 0,
  );
  TestValidator.predicate(
    "cart updated_at defined",
    typeof cart.updated_at === "string" && cart.updated_at.length > 0,
  );
}
