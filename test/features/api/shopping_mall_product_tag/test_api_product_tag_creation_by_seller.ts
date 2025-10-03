import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallChannelCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannelCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductTag";
import type { IShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSection";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * E2E test to ensure that a seller can create and attach a new tag to their
 * product.
 *
 * Business context: Tags are used by sellers to classify products for SEO,
 * campaigns, and catalog discoverability.
 *
 * Test Steps:
 *
 * 1. Create a channel (admin).
 * 2. Create a section in the channel (admin).
 * 3. Create a category in the channel (admin).
 * 4. Register a seller, linking to the channel and section.
 * 5. Seller creates a product, specifying channel, section, category.
 * 6. Seller creates a tag via `/shoppingMall/seller/products/{productId}/tags`.
 * 7. Validate the tag is created, attached to correct product, value matches
 *    input, and tag constraints are enforced (happy path).
 * 8. Attempt duplicate tag creation for same product, confirm error is thrown
 *    (error path).
 */
export async function test_api_product_tag_creation_by_seller(
  connection: api.IConnection,
) {
  // 1. Create a channel (admin)
  const channelCreate = {
    code: RandomGenerator.alphabets(8),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph(),
  } satisfies IShoppingMallChannel.ICreate;
  const channel: IShoppingMallChannel =
    await api.functional.shoppingMall.admin.channels.create(connection, {
      body: channelCreate,
    });
  typia.assert(channel);
  // 2. Create a section (admin)
  const sectionCreate = {
    shopping_mall_channel_id: channel.id,
    code: RandomGenerator.alphabets(6),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph(),
    display_order: 1,
  } satisfies IShoppingMallSection.ICreate;
  const section: IShoppingMallSection =
    await api.functional.shoppingMall.admin.channels.sections.create(
      connection,
      { channelId: channel.id, body: sectionCreate },
    );
  typia.assert(section);
  // 3. Create a category (admin)
  const categoryCreate = {
    shopping_mall_channel_id: channel.id,
    parent_id: undefined,
    code: RandomGenerator.alphabets(5),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph(),
    display_order: 1,
  } satisfies IShoppingMallChannelCategory.ICreate;
  const category: IShoppingMallChannelCategory =
    await api.functional.shoppingMall.admin.channels.categories.create(
      connection,
      { channelId: channel.id, body: categoryCreate },
    );
  typia.assert(category);
  // 4. Register a seller linked to channel/section
  const sellerEmail =
    RandomGenerator.name().replace(/\s/g, "") + "@example.com";
  const sellerJoin = {
    email: sellerEmail,
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    shopping_mall_channel_id: channel.id,
    shopping_mall_section_id: section.id,
    profile_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSeller.IJoin;
  const sellerAuth = await api.functional.auth.seller.join(connection, {
    body: sellerJoin,
  });
  typia.assert(sellerAuth);
  // 5. Register a product as seller
  const productCreate = {
    shopping_mall_seller_id: sellerAuth.id,
    shopping_mall_channel_id: channel.id,
    shopping_mall_section_id: section.id,
    shopping_mall_category_id: category.id,
    code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    status: "active",
    business_status: "approval",
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreate,
    });
  typia.assert(product);
  // 6. Seller attaches a tag
  const tagValue = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 3,
    wordMax: 10,
  });
  const tagCreate = {
    shopping_mall_product_id: product.id,
    tag: tagValue,
  } satisfies IShoppingMallProductTag.ICreate;
  const tag: IShoppingMallProductTag =
    await api.functional.shoppingMall.seller.products.tags.create(connection, {
      productId: product.id,
      body: tagCreate,
    });
  typia.assert(tag);
  TestValidator.equals(
    "tag attached product ID should match",
    tag.shopping_mall_product_id,
    product.id,
  );
  TestValidator.equals("tag value matches", tag.tag, tagValue);
  // 7. Try creating duplicate tag, expect error
  await TestValidator.error(
    "duplicate tag for product must be rejected",
    async () => {
      await api.functional.shoppingMall.seller.products.tags.create(
        connection,
        { productId: product.id, body: tagCreate },
      );
    },
  );
}
