import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallChannelCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannelCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductContent";
import type { IShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSection";

/**
 * Validate admin product content detail retrieval and permission enforcement.
 *
 * 1. Register and authenticate a new admin (join).
 * 2. Create channel, then section in channel, then category in channel.
 * 3. Register a product as admin with channel/section/category.
 * 4. Retrieve product content details and assert required fields.
 * 5. Edge: Attempt to retrieve content for non-existent productId (expect error).
 * 6. Edge: Try access without admin permission (expect error).
 */
export async function test_api_admin_product_content_detail_fetch(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as admin
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
  } satisfies IShoppingMallAdmin.IJoin;
  const admin = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert(admin);

  // 2. Create channel
  const channelBody = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph(),
  } satisfies IShoppingMallChannel.ICreate;
  const channel = await api.functional.shoppingMall.admin.channels.create(
    connection,
    { body: channelBody },
  );
  typia.assert(channel);

  // 3. Create section in channel
  const sectionBody = {
    shopping_mall_channel_id: channel.id,
    code: RandomGenerator.alphaNumeric(4),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    display_order: typia.random<number & tags.Type<"int32">>(),
  } satisfies IShoppingMallSection.ICreate;
  const section =
    await api.functional.shoppingMall.admin.channels.sections.create(
      connection,
      {
        channelId: channel.id,
        body: sectionBody,
      },
    );
  typia.assert(section);

  // 4. Create category in channel
  const categoryBody = {
    shopping_mall_channel_id: channel.id,
    code: RandomGenerator.alphaNumeric(6),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    display_order: typia.random<number & tags.Type<"int32">>(),
  } satisfies IShoppingMallChannelCategory.ICreate;
  const category =
    await api.functional.shoppingMall.admin.channels.categories.create(
      connection,
      {
        channelId: channel.id,
        body: categoryBody,
      },
    );
  typia.assert(category);

  // 5. Register product as admin
  const productBody = {
    shopping_mall_seller_id: typia.random<string & tags.Format<"uuid">>(), // Required by schema
    shopping_mall_channel_id: channel.id,
    shopping_mall_section_id: section.id,
    shopping_mall_category_id: category.id,
    code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.paragraph({ sentences: 3 }),
    status: "Active",
    business_status: "Approval",
  } satisfies IShoppingMallProduct.ICreate;
  const product = await api.functional.shoppingMall.admin.products.create(
    connection,
    {
      body: productBody,
    },
  );
  typia.assert(product);

  // 6. Retrieve product content as admin
  const content = await api.functional.shoppingMall.admin.products.content.at(
    connection,
    {
      productId: product.id,
    },
  );
  typia.assert(content);
  TestValidator.equals(
    "product content productId should match",
    content.shopping_mall_product_id,
    product.id,
  );
  TestValidator.predicate(
    "product content has non-empty content_markdown",
    typeof content.content_markdown === "string" &&
      content.content_markdown.length > 0,
  );
  TestValidator.predicate(
    "product content has return_policy",
    typeof content.return_policy === "string",
  );
  TestValidator.predicate(
    "product content has warranty_policy",
    typeof content.warranty_policy === "string",
  );
  TestValidator.predicate(
    "product content has locale",
    typeof content.locale === "string" && content.locale.length > 0,
  );

  // 7. Edge case: retrieve content for non-existent product (invalid UUID)
  await TestValidator.error(
    "should error for non-existent product",
    async () => {
      await api.functional.shoppingMall.admin.products.content.at(connection, {
        productId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );

  // 8. Edge case: unauthenticated/non-admin access
  const unauthConnection: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "should error without admin permission",
    async () => {
      await api.functional.shoppingMall.admin.products.content.at(
        unauthConnection,
        {
          productId: product.id,
        },
      );
    },
  );
}
