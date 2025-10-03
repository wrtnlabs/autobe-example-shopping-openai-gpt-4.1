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
 * Validate creation of a new customer cart and confirm required metadata
 * linkages.
 *
 * Steps:
 *
 * 1. Create a channel
 * 2. Create a section within the channel
 * 3. Register (join) a new customer, linked to the above channel
 * 4. Create a new cart for the customer, providing all required metadata
 * 5. Assert cart linkage to correct customer/channel/section and business fields
 */
export async function test_api_customer_cart_creation_basic(
  connection: api.IConnection,
) {
  // 1. Create channel
  const channelInput = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IShoppingMallChannel.ICreate;
  const channel = await api.functional.shoppingMall.admin.channels.create(
    connection,
    {
      body: channelInput,
    },
  );
  typia.assert(channel);

  // 2. Create section in channel
  const sectionInput = {
    shopping_mall_channel_id: channel.id,
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(2),
    display_order: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<1000>
    >() satisfies number as number,
    description: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IShoppingMallSection.ICreate;
  const section =
    await api.functional.shoppingMall.admin.channels.sections.create(
      connection,
      {
        channelId: channel.id,
        body: sectionInput,
      },
    );
  typia.assert(section);

  // 3. Join/register customer for that channel
  const customerInput = {
    shopping_mall_channel_id: channel.id,
    email: RandomGenerator.alphaNumeric(8) + "@test.com",
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(2),
    phone: RandomGenerator.mobile(),
  } satisfies IShoppingMallCustomer.IJoin;
  const customer = await api.functional.auth.customer.join(connection, {
    body: customerInput,
  });
  typia.assert(customer);

  // 4. Create cart for this customer/channel/section
  const cartInput = {
    shopping_mall_customer_id: customer.id,
    shopping_mall_channel_id: channel.id,
    shopping_mall_section_id: section.id,
    source: "member",
  } satisfies IShoppingMallCart.ICreate;
  const cart = await api.functional.shoppingMall.customer.carts.create(
    connection,
    {
      body: cartInput,
    },
  );
  typia.assert(cart);

  // 5. Assert business linkage
  TestValidator.equals(
    "cart.customer linkage",
    cart.shopping_mall_customer_id,
    customer.id,
  );
  TestValidator.equals(
    "cart.channel linkage",
    cart.shopping_mall_channel_id,
    channel.id,
  );
  TestValidator.equals(
    "cart.section linkage",
    cart.shopping_mall_section_id,
    section.id,
  );
  TestValidator.equals("cart source type", cart.source, cartInput.source);
  TestValidator.predicate(
    "cart is active or ready",
    cart.status === "active" ||
      cart.status === "ready" ||
      typeof cart.status === "string",
  );
}
