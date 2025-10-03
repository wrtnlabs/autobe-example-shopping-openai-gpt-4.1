import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallChannelCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannelCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSection";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test minimal product registration as an authenticated seller.
 *
 * Registers seller, channel, section, and category, then a product with ONLY
 * required fields. Verifies product is linked/owned correctly and all required
 * links are set. Only authenticated sellers permitted.
 */
export async function test_api_seller_product_registration_minimal(
  connection: api.IConnection,
) {
  // 1. Create channel (admin only)
  const channelInput = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(),
  } satisfies IShoppingMallChannel.ICreate;
  const channel = await api.functional.shoppingMall.admin.channels.create(
    connection,
    { body: channelInput },
  );
  typia.assert(channel);

  // 2. Create section in channel
  const sectionInput = {
    shopping_mall_channel_id: channel.id,
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(),
    display_order: 1,
  } satisfies IShoppingMallSection.ICreate;
  const section =
    await api.functional.shoppingMall.admin.channels.sections.create(
      connection,
      { channelId: channel.id, body: sectionInput },
    );
  typia.assert(section);

  // 3. Create category in channel
  const categoryInput = {
    shopping_mall_channel_id: channel.id,
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(),
    display_order: 1,
  } satisfies IShoppingMallChannelCategory.ICreate;
  const category =
    await api.functional.shoppingMall.admin.channels.categories.create(
      connection,
      { channelId: channel.id, body: categoryInput },
    );
  typia.assert(category);

  // 4. Register seller for this channel/section
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerJoinInput = {
    email: sellerEmail,
    password: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
    shopping_mall_channel_id: channel.id,
    shopping_mall_section_id: section.id,
    profile_name: RandomGenerator.name(),
  } satisfies IShoppingMallSeller.IJoin;
  const sellerAuth = await api.functional.auth.seller.join(connection, {
    body: sellerJoinInput,
  });
  typia.assert(sellerAuth);
  TestValidator.equals(
    "seller section",
    sellerAuth.shopping_mall_section_id,
    section.id,
  );

  // 5. Register product with minimal fields
  const code = RandomGenerator.alphaNumeric(12);
  const name = RandomGenerator.name();
  const minimalProductInput = {
    shopping_mall_seller_id: sellerAuth.id,
    shopping_mall_channel_id: channel.id,
    shopping_mall_section_id: section.id,
    shopping_mall_category_id: category.id,
    code,
    name,
    status: "active",
    business_status: "approval",
  } satisfies IShoppingMallProduct.ICreate;
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    { body: minimalProductInput },
  );
  typia.assert(product);
  TestValidator.equals(
    "product seller",
    product.shopping_mall_seller_id,
    sellerAuth.id,
  );
  TestValidator.equals(
    "product channel",
    product.shopping_mall_channel_id,
    channel.id,
  );
  TestValidator.equals(
    "product section",
    product.shopping_mall_section_id,
    section.id,
  );
  TestValidator.equals(
    "product category",
    product.shopping_mall_category_id,
    category.id,
  );
  TestValidator.equals("product code", product.code, code);
  TestValidator.equals("product name", product.name, name);
  TestValidator.equals("product status", product.status, "active");
  TestValidator.equals(
    "product business_status",
    product.business_status,
    "approval",
  );
}
