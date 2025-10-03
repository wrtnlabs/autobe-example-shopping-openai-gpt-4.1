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
 * Validate that an admin can update the rich content and compliance policies
 * (description, return policy, warranty, locale) of an existing product.
 *
 * Workflow:
 *
 * 1. Register a new admin and authenticate.
 * 2. Create required channel, section, and category.
 * 3. Register a product as admin (with initial required fields).
 * 4. Update the product's content fields using the update API.
 * 5. Verify the update by retrieving product content (assume product content is
 *    returned as update response).
 * 6. Edge case: Try updating content for a non-existent productId (expect error).
 */
export async function test_api_admin_product_content_update(
  connection: api.IConnection,
) {
  // 1. Register and authenticate admin
  const adminBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
  } satisfies IShoppingMallAdmin.IJoin;
  const adminAuth: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminBody });
  typia.assert(adminAuth);

  // 2. Create channel
  const channelBody = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph(),
  } satisfies IShoppingMallChannel.ICreate;
  const channel: IShoppingMallChannel =
    await api.functional.shoppingMall.admin.channels.create(connection, {
      body: channelBody,
    });
  typia.assert(channel);

  // 3. Create section
  const sectionBody = {
    shopping_mall_channel_id: channel.id,
    code: RandomGenerator.alphaNumeric(6),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph(),
    display_order: 1,
  } satisfies IShoppingMallSection.ICreate;
  const section: IShoppingMallSection =
    await api.functional.shoppingMall.admin.channels.sections.create(
      connection,
      {
        channelId: channel.id,
        body: sectionBody,
      },
    );
  typia.assert(section);

  // 4. Create category
  const categoryBody = {
    shopping_mall_channel_id: channel.id,
    code: RandomGenerator.alphaNumeric(6),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph(),
    display_order: 1,
  } satisfies IShoppingMallChannelCategory.ICreate;
  const category: IShoppingMallChannelCategory =
    await api.functional.shoppingMall.admin.channels.categories.create(
      connection,
      {
        channelId: channel.id,
        body: categoryBody,
      },
    );
  typia.assert(category);

  // 5. Create product
  const productBody = {
    shopping_mall_seller_id: typia.random<string & tags.Format<"uuid">>(), // Random UUID because admin creates global products
    shopping_mall_channel_id: channel.id,
    shopping_mall_section_id: section.id,
    shopping_mall_category_id: category.id,
    code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
    status: "Active", // Assuming open status value
    business_status: "Approval",
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.admin.products.create(connection, {
      body: productBody,
    });
  typia.assert(product);

  // 6. Update product content
  const contentUpdate = {
    content_markdown: RandomGenerator.content({ paragraphs: 2 }),
    return_policy: RandomGenerator.paragraph({ sentences: 5 }),
    warranty_policy: RandomGenerator.paragraph({ sentences: 5 }),
    locale: RandomGenerator.pick(["en-US", "ko-KR", "ja-JP", "zh-CN"] as const),
  } satisfies IShoppingMallProductContent.IUpdate;
  const updateResp: IShoppingMallProductContent =
    await api.functional.shoppingMall.admin.products.content.update(
      connection,
      {
        productId: product.id,
        body: contentUpdate,
      },
    );
  typia.assert(updateResp);
  TestValidator.equals(
    "content_markdown updated",
    updateResp.content_markdown,
    contentUpdate.content_markdown,
  );
  TestValidator.equals(
    "return_policy updated",
    updateResp.return_policy,
    contentUpdate.return_policy,
  );
  TestValidator.equals(
    "warranty_policy updated",
    updateResp.warranty_policy,
    contentUpdate.warranty_policy,
  );
  TestValidator.equals(
    "locale updated",
    updateResp.locale,
    contentUpdate.locale,
  );

  // 7. Edge case: update non-existent productId
  await TestValidator.error(
    "update non-existent productId should fail",
    async () => {
      await api.functional.shoppingMall.admin.products.content.update(
        connection,
        {
          productId: typia.random<string & tags.Format<"uuid">>(),
          body: contentUpdate,
        },
      );
    },
  );
}
