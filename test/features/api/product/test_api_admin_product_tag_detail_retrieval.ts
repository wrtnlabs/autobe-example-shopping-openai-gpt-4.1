import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallChannelCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannelCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductTag";
import type { IShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSection";

/**
 * Validate admin product tag detail retrieval and permission logic.
 *
 * Steps:
 *
 * - 1. Register a new admin (creates session)
 * - 2. Admin creates a channel
 * - 3. Admin adds a section under the channel
 * - 4. Admin adds a category under the channel
 * - 5. Admin registers a product with channel, section, category
 * - 6. Admin attaches a tag to this product
 * - 7. Admin retrieves the tag details for that tag
 * - 8. Assert all fields and cross-references match
 * - 9. (Edge) Attempt same retrieval with unauthenticated (non-admin) connection,
 *        expect rejection
 */
export async function test_api_admin_product_tag_detail_retrieval(
  connection: api.IConnection,
) {
  // 1. Register a new admin
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecurePW-123!",
    name: RandomGenerator.name(),
  } satisfies IShoppingMallAdmin.IJoin;
  const admin = await api.functional.auth.admin.join(connection, {
    body: joinInput,
  });
  typia.assert(admin);

  // 2. Create a channel
  const channelBody = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IShoppingMallChannel.ICreate;
  const channel = await api.functional.shoppingMall.admin.channels.create(
    connection,
    { body: channelBody },
  );
  typia.assert(channel);

  // 3. Create a section
  const sectionBody = {
    shopping_mall_channel_id: channel.id,
    code: RandomGenerator.alphaNumeric(5),
    name: RandomGenerator.name(1),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    display_order: 1,
  } satisfies IShoppingMallSection.ICreate;
  const section =
    await api.functional.shoppingMall.admin.channels.sections.create(
      connection,
      { channelId: channel.id, body: sectionBody },
    );
  typia.assert(section);

  // 4. Create a category
  const categoryBody = {
    shopping_mall_channel_id: channel.id,
    code: RandomGenerator.alphaNumeric(6),
    name: RandomGenerator.name(1),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    display_order: 1,
  } satisfies IShoppingMallChannelCategory.ICreate;
  const category =
    await api.functional.shoppingMall.admin.channels.categories.create(
      connection,
      { channelId: channel.id, body: categoryBody },
    );
  typia.assert(category);

  // 5. Admin registers product
  const productBody = {
    shopping_mall_seller_id: typia.random<string & tags.Format<"uuid">>(), // required but no admin-owned seller, random value
    shopping_mall_channel_id: channel.id,
    shopping_mall_section_id: section.id,
    shopping_mall_category_id: category.id,
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(2),
    status: "Active",
    business_status: "Approved",
  } satisfies IShoppingMallProduct.ICreate;
  const product = await api.functional.shoppingMall.admin.products.create(
    connection,
    { body: productBody },
  );
  typia.assert(product);

  // 6. Attach tag to product
  const tagString = RandomGenerator.alphabets(8);
  const tagCreateBody = {
    shopping_mall_product_id: product.id,
    tag: tagString,
  } satisfies IShoppingMallProductTag.ICreate;
  const tagResult =
    await api.functional.shoppingMall.admin.products.tags.create(connection, {
      productId: product.id,
      body: tagCreateBody,
    });
  typia.assert(tagResult);

  // 7. Retrieve tag details
  const tagDetail = await api.functional.shoppingMall.admin.products.tags.at(
    connection,
    { productId: product.id, tagId: tagResult.id },
  );
  typia.assert(tagDetail);

  // 8. Assert all fields match and are visible
  TestValidator.equals("tag id matches", tagDetail.id, tagResult.id);
  TestValidator.equals(
    "tag references correct product",
    tagDetail.shopping_mall_product_id,
    product.id,
  );
  TestValidator.equals("tag string value matches", tagDetail.tag, tagString);

  // 9. Attempt to get tag detail without admin authentication - should be forbidden
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "non-admin cannot access admin tag detail endpoint",
    async () => {
      await api.functional.shoppingMall.admin.products.tags.at(unauthConn, {
        productId: product.id,
        tagId: tagDetail.id,
      });
    },
  );
}
