import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSection";

/**
 * Validate customer-only access to cart details by cartId.
 *
 * This test simulates a full business workflow confirming that a customer can
 * fetch only their own shopping cart's details and that cross-user access is
 * blocked.
 *
 * 1. Admin creates a channel (code/name/description).
 * 2. Admin creates a section within that channel with unique
 *    code/name/display_order.
 * 3. Customer A registers using the new channel and password (email, name, phone).
 * 4. As Customer A: create a cart under the channel/section for themselves,
 *    setting 'source' appropriately.
 * 5. As Customer A: retrieve cart details by id, assert all fields match creation
 *    and type expectations.
 * 6. Register Customer B (with different email) and login as Customer B.
 * 7. As Customer B: attempt to access A's cart by cartId—must result in error
 *    (TestValidator.error).
 * 8. As Customer A: attempt to access a non-existent cartId—must result in error.
 */
export async function test_api_customer_cart_detail_access_by_owner(
  connection: api.IConnection,
) {
  // 1. Admin creates channel
  const channelInput = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph(),
  } satisfies IShoppingMallChannel.ICreate;
  const channel = await api.functional.shoppingMall.admin.channels.create(
    connection,
    { body: channelInput },
  );
  typia.assert(channel);

  // 2. Admin creates section in the channel
  const sectionInput = {
    shopping_mall_channel_id: channel.id,
    code: RandomGenerator.alphaNumeric(6),
    name: RandomGenerator.name(2),
    display_order: typia.random<number & tags.Type<"int32">>(),
    description: RandomGenerator.paragraph(),
  } satisfies IShoppingMallSection.ICreate;
  const section =
    await api.functional.shoppingMall.admin.channels.sections.create(
      connection,
      { channelId: channel.id, body: sectionInput },
    );
  typia.assert(section);

  // 3. Register customer A
  const customerAEmail = typia.random<string & tags.Format<"email">>();
  const customerAJoin = {
    shopping_mall_channel_id: channel.id,
    email: customerAEmail,
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IShoppingMallCustomer.IJoin;
  const customerA = await api.functional.auth.customer.join(connection, {
    body: customerAJoin,
  });
  typia.assert(customerA);

  // 4. As customer A: create a cart for themselves
  const cartInputA = {
    shopping_mall_customer_id: customerA.id,
    shopping_mall_channel_id: channel.id,
    shopping_mall_section_id: section.id,
    source: "member",
  } satisfies IShoppingMallCart.ICreate;
  const cartA = await api.functional.shoppingMall.customer.carts.create(
    connection,
    { body: cartInputA },
  );
  typia.assert(cartA);

  // 5. As customer A: retrieve cart by cartId, assert fields match
  const cartARead = await api.functional.shoppingMall.customer.carts.at(
    connection,
    { cartId: cartA.id },
  );
  typia.assert(cartARead);
  TestValidator.equals("customer can read own cart", cartARead.id, cartA.id);
  TestValidator.equals(
    "customer_id matches",
    cartARead.shopping_mall_customer_id,
    customerA.id,
  );
  TestValidator.equals(
    "channel_id matches",
    cartARead.shopping_mall_channel_id,
    channel.id,
  );
  TestValidator.equals(
    "section_id matches",
    cartARead.shopping_mall_section_id,
    section.id,
  );
  TestValidator.equals("source matches", cartARead.source, cartInputA.source);
  TestValidator.equals(
    "status is active/initial",
    cartARead.status,
    cartA.status,
  );

  // 6. Register customer B
  const customerBEmail = typia.random<string & tags.Format<"email">>();
  const customerBJoin = {
    shopping_mall_channel_id: channel.id,
    email: customerBEmail,
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IShoppingMallCustomer.IJoin;
  const customerB = await api.functional.auth.customer.join(connection, {
    body: customerBJoin,
  });
  typia.assert(customerB);

  // 7. As customer B: attempt to access A's cart—must fail
  await TestValidator.error(
    "customer cannot access other customer's cart",
    async () => {
      await api.functional.shoppingMall.customer.carts.at(connection, {
        cartId: cartA.id,
      });
    },
  );

  // 8. As customer A: attempt to access a non-existent cartId
  await api.functional.auth.customer.join(connection, { body: customerAJoin }); // Switch back to A
  const nonExistentCartId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("accessing non-existent cart fails", async () => {
    await api.functional.shoppingMall.customer.carts.at(connection, {
      cartId: nonExistentCartId,
    });
  });
}
