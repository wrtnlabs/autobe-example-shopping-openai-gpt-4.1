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
 * Validate that an authenticated seller can retrieve full business metadata for
 * a tag assigned to one of their products.
 *
 * The test covers the complete business flow and verifies linkage, visibility,
 * and correct permissions:
 *
 * 1. Seller registers by joining (POST /auth/seller/join)
 * 2. Admin creates a channel
 * 3. Admin creates a section within the channel
 * 4. Admin creates a category within the channel
 * 5. Seller registers a product assigned to their channel, section, category
 * 6. Seller creates a new tag and attaches it to the product
 * 7. Seller retrieves the tag detail (GET
 *    /shoppingMall/seller/products/{productId}/tags/{tagId})
 * 8. Validate tag meta, linkage to correct product, owner permission, and field
 *    visibility
 */
export async function test_api_product_tag_detail_retrieval_by_seller(
  connection: api.IConnection,
) {
  // Step 1: Admin creates channel
  const channelCreate = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IShoppingMallChannel.ICreate;
  const channel = await api.functional.shoppingMall.admin.channels.create(
    connection,
    { body: channelCreate },
  );
  typia.assert(channel);
  TestValidator.equals(
    "channel code matches",
    channel.code,
    channelCreate.code,
  );
  TestValidator.equals(
    "channel name matches",
    channel.name,
    channelCreate.name,
  );

  // Step 2: Admin creates section under the channel
  const sectionCreate = {
    shopping_mall_channel_id: channel.id,
    code: RandomGenerator.alphaNumeric(6),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    display_order: typia.random<number & tags.Type<"int32">>(),
  } satisfies IShoppingMallSection.ICreate;
  const section =
    await api.functional.shoppingMall.admin.channels.sections.create(
      connection,
      {
        channelId: channel.id,
        body: sectionCreate,
      },
    );
  typia.assert(section);
  TestValidator.equals(
    "section channel linkage",
    section.shopping_mall_channel_id,
    channel.id,
  );

  // Step 3: Admin creates category under channel
  const categoryCreate = {
    shopping_mall_channel_id: channel.id,
    code: RandomGenerator.alphaNumeric(7),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    display_order: typia.random<number & tags.Type<"int32">>(),
  } satisfies IShoppingMallChannelCategory.ICreate;
  const category =
    await api.functional.shoppingMall.admin.channels.categories.create(
      connection,
      {
        channelId: channel.id,
        body: categoryCreate,
      },
    );
  typia.assert(category);
  TestValidator.equals(
    "category channel linkage",
    category.shopping_mall_channel_id,
    channel.id,
  );

  // Step 4: Seller joins the created channel/section
  const sellerEmail =
    RandomGenerator.name(2).replace(" ", ".") + "@e2e-seller.com";
  const sellerJoin = {
    email: sellerEmail,
    password: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
    shopping_mall_channel_id: channel.id,
    shopping_mall_section_id: section.id,
    profile_name: RandomGenerator.name(),
    kyc_status: "pending",
  } satisfies IShoppingMallSeller.IJoin;
  const sellerAuth = await api.functional.auth.seller.join(connection, {
    body: sellerJoin,
  });
  typia.assert(sellerAuth);
  TestValidator.equals(
    "seller profile channel linkage",
    sellerAuth.shopping_mall_section_id,
    section.id,
  );
  TestValidator.equals(
    "seller profile_name",
    sellerAuth.profile_name,
    sellerJoin.profile_name,
  );

  // Step 5: Seller registers a product assigned to their section, channel, and category
  const productCode = RandomGenerator.alphaNumeric(7);
  const productCreate = {
    shopping_mall_seller_id: sellerAuth.id,
    shopping_mall_channel_id: channel.id,
    shopping_mall_section_id: section.id,
    shopping_mall_category_id: category.id,
    code: productCode,
    name: RandomGenerator.paragraph({ sentences: 3 }),
    status: "Active",
    business_status: "Approval",
  } satisfies IShoppingMallProduct.ICreate;
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    { body: productCreate },
  );
  typia.assert(product);
  TestValidator.equals(
    "product code matches",
    product.code,
    productCreate.code,
  );
  TestValidator.equals(
    "product seller linkage",
    product.shopping_mall_seller_id,
    sellerAuth.id,
  );

  // Step 6: Seller attaches a new tag to the product
  const tagValue = RandomGenerator.paragraph({ sentences: 2 });
  const tagCreate = {
    shopping_mall_product_id: product.id,
    tag: tagValue,
  } satisfies IShoppingMallProductTag.ICreate;
  const tag = await api.functional.shoppingMall.seller.products.tags.create(
    connection,
    {
      productId: product.id,
      body: tagCreate,
    },
  );
  typia.assert(tag);
  TestValidator.equals(
    "tag linkage to product",
    tag.shopping_mall_product_id,
    product.id,
  );
  TestValidator.equals("tag value matches", tag.tag, tagValue);

  // Step 7: Seller retrieves the tag detail
  const tagDetail = await api.functional.shoppingMall.seller.products.tags.at(
    connection,
    {
      productId: product.id,
      tagId: tag.id,
    },
  );
  typia.assert(tagDetail);

  // Step 8: Business & technical assertions
  TestValidator.equals("seller retrieves same tag id", tagDetail.id, tag.id);
  TestValidator.equals(
    "tag belongs to correct product",
    tagDetail.shopping_mall_product_id,
    product.id,
  );
  TestValidator.equals("tag field matches", tagDetail.tag, tagValue);
}
