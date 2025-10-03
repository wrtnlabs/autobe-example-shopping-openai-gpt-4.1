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
 * E2E test for seller-side deletion of a product tag, including full dependency
 * business flow.
 *
 * 1. Register a new admin channel, section, and category
 * 2. Register a seller account for the channel/section
 * 3. Register a product under that seller, channel/section/category
 * 4. Create a tag on the product
 * 5. Delete the tag as the product's seller
 * 6. Attempt to delete the tag again (should fail with error)
 * 7. Recreate a tag with the same value to verify full deletion
 * 8. Attempt deletion from a different seller (should fail with error)
 */
export async function test_api_product_tag_delete_by_seller(
  connection: api.IConnection,
) {
  // 1. Admin: create channel
  const channelInput = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 2,
      sentenceMax: 6,
    }),
  } satisfies IShoppingMallChannel.ICreate;
  const channel = await api.functional.shoppingMall.admin.channels.create(
    connection,
    { body: channelInput },
  );
  typia.assert(channel);

  // 2. Admin: create section
  const sectionInput = {
    shopping_mall_channel_id: channel.id,
    code: RandomGenerator.alphaNumeric(6),
    name: RandomGenerator.name(2),
    display_order: 1,
  } satisfies IShoppingMallSection.ICreate;
  const section =
    await api.functional.shoppingMall.admin.channels.sections.create(
      connection,
      { channelId: channel.id, body: sectionInput },
    );
  typia.assert(section);

  // 3. Admin: create category
  const categoryInput = {
    shopping_mall_channel_id: channel.id,
    code: RandomGenerator.alphaNumeric(5),
    name: RandomGenerator.name(1),
    display_order: 1,
  } satisfies IShoppingMallChannelCategory.ICreate;
  const category =
    await api.functional.shoppingMall.admin.channels.categories.create(
      connection,
      { channelId: channel.id, body: categoryInput },
    );
  typia.assert(category);

  // 4. Register the seller for this channel + section
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerJoinBody = {
    email: sellerEmail,
    password: "1234secure",
    name: RandomGenerator.name(),
    shopping_mall_channel_id: channel.id,
    shopping_mall_section_id: section.id,
    profile_name: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IShoppingMallSeller.IJoin;
  const sellerAuth = await api.functional.auth.seller.join(connection, {
    body: sellerJoinBody,
  });
  typia.assert(sellerAuth);

  // 5. Seller registers a product
  const productInput = {
    shopping_mall_seller_id: sellerAuth.id,
    shopping_mall_channel_id: channel.id,
    shopping_mall_section_id: section.id,
    shopping_mall_category_id: category.id,
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    status: "Active",
    business_status: "Approval",
  } satisfies IShoppingMallProduct.ICreate;
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    { body: productInput },
  );
  typia.assert(product);

  // 6. Seller attaches a tag to the product
  const tagValue = RandomGenerator.paragraph({ sentences: 1 });
  const tagInput = {
    shopping_mall_product_id: product.id,
    tag: tagValue,
  } satisfies IShoppingMallProductTag.ICreate;
  const tag = await api.functional.shoppingMall.seller.products.tags.create(
    connection,
    { productId: product.id, body: tagInput },
  );
  typia.assert(tag);

  // 7. Seller deletes the product tag
  await api.functional.shoppingMall.seller.products.tags.erase(connection, {
    productId: product.id,
    tagId: tag.id,
  });

  // 8. Try deleting the tag again (should fail)
  await TestValidator.error(
    "delete already deleted tag should fail",
    async () => {
      await api.functional.shoppingMall.seller.products.tags.erase(connection, {
        productId: product.id,
        tagId: tag.id,
      });
    },
  );

  // 9. Seller creates a new tag with same value (to confirm tag was fully removed)
  const tag2 = await api.functional.shoppingMall.seller.products.tags.create(
    connection,
    { productId: product.id, body: tagInput },
  );
  typia.assert(tag2);

  // 10. Register a different seller for this channel/section
  const sellerEmail2 = typia.random<string & tags.Format<"email">>();
  const sellerJoinBody2 = {
    email: sellerEmail2,
    password: "diff4567secure",
    name: RandomGenerator.name(),
    shopping_mall_channel_id: channel.id,
    shopping_mall_section_id: section.id,
    profile_name: RandomGenerator.name() + " Shop",
  } satisfies IShoppingMallSeller.IJoin;
  const sellerAuth2 = await api.functional.auth.seller.join(connection, {
    body: sellerJoinBody2,
  });
  typia.assert(sellerAuth2);

  // 11. Attempt tag deletion as another (non-owner) seller (should fail)
  await TestValidator.error("non-owner cannot delete product tag", async () => {
    await api.functional.shoppingMall.seller.products.tags.erase(connection, {
      productId: product.id,
      tagId: tag2.id,
    });
  });
}
