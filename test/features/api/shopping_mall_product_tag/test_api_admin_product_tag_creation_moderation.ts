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
 * E2E test validating that an admin can create and attach a new tag to a
 * product for moderation/campaign/compliance.
 *
 * Steps:
 *
 * 1. Register an admin & authenticate.
 * 2. Create a channel.
 * 3. Create a section with unique code within channel.
 * 4. Create a root category linked to the channel.
 * 5. Create a product attached to seller_id, channel, section, and category.
 * 6. Attach a unique tag as admin.
 * 7. Validate tag details and linkage: tag value, product ID, uniqueness.
 * 8. Assert duplicate tag creation fails (uniqueness constraint).
 */
export async function test_api_admin_product_tag_creation_moderation(
  connection: api.IConnection,
) {
  // 1. Admin registration (and implicit login)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "strongPassword123!",
        name: RandomGenerator.name(),
      } satisfies IShoppingMallAdmin.IJoin,
    });
  typia.assert(admin); // Contains admin and access token

  // 2. Create a channel
  const channelCode = RandomGenerator.alphaNumeric(8);
  const channelName = RandomGenerator.name();
  const channel: IShoppingMallChannel =
    await api.functional.shoppingMall.admin.channels.create(connection, {
      body: {
        code: channelCode,
        name: channelName,
        description: RandomGenerator.paragraph(),
      } satisfies IShoppingMallChannel.ICreate,
    });
  typia.assert(channel);
  TestValidator.equals("channel code", channel.code, channelCode);
  TestValidator.equals("channel name", channel.name, channelName);

  // 3. Create a section
  const sectionCode = RandomGenerator.alphaNumeric(6);
  const section: IShoppingMallSection =
    await api.functional.shoppingMall.admin.channels.sections.create(
      connection,
      {
        channelId: channel.id,
        body: {
          shopping_mall_channel_id: channel.id,
          code: sectionCode,
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph(),
          display_order: 1,
        } satisfies IShoppingMallSection.ICreate,
      },
    );
  typia.assert(section);
  TestValidator.equals(
    "section channel_id",
    section.shopping_mall_channel_id,
    channel.id,
  );
  TestValidator.equals("section code", section.code, sectionCode);

  // 4. Create a root category
  const categoryCode = RandomGenerator.alphaNumeric(5);
  const category: IShoppingMallChannelCategory =
    await api.functional.shoppingMall.admin.channels.categories.create(
      connection,
      {
        channelId: channel.id,
        body: {
          shopping_mall_channel_id: channel.id,
          parent_id: null,
          code: categoryCode,
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph(),
          display_order: 1,
        } satisfies IShoppingMallChannelCategory.ICreate,
      },
    );
  typia.assert(category);
  TestValidator.equals(
    "category channel_id",
    category.shopping_mall_channel_id,
    channel.id,
  );
  TestValidator.equals("category code", category.code, categoryCode);
  TestValidator.equals("category parent_id is null", category.parent_id, null);

  // 5. Register a product (admin-test-owned, but requires all FKs)
  const productCode = RandomGenerator.alphaNumeric(10);
  const productName = RandomGenerator.name();
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.admin.products.create(connection, {
      body: {
        shopping_mall_seller_id: admin.id, // Admin acts as seller in this context
        shopping_mall_channel_id: channel.id,
        shopping_mall_section_id: section.id,
        shopping_mall_category_id: category.id,
        code: productCode,
        name: productName,
        status: "active",
        business_status: "approval",
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(product);
  TestValidator.equals(
    "product channel_id",
    product.shopping_mall_channel_id,
    channel.id,
  );
  TestValidator.equals(
    "product section_id",
    product.shopping_mall_section_id,
    section.id,
  );
  TestValidator.equals(
    "product category_id",
    product.shopping_mall_category_id,
    category.id,
  );
  TestValidator.equals("product code", product.code, productCode);
  TestValidator.equals("product name", product.name, productName);

  // 6. Create and attach a tag
  const tagValue = RandomGenerator.alphaNumeric(12);
  const tag: IShoppingMallProductTag =
    await api.functional.shoppingMall.admin.products.tags.create(connection, {
      productId: product.id,
      body: {
        shopping_mall_product_id: product.id,
        tag: tagValue,
      } satisfies IShoppingMallProductTag.ICreate,
    });
  typia.assert(tag);
  TestValidator.equals(
    "tag id matches product",
    tag.shopping_mall_product_id,
    product.id,
  );
  TestValidator.equals("tag value matches", tag.tag, tagValue);

  // 7. Confirm tag uniqueness (attempt duplicate tag, expect error)
  await TestValidator.error("duplicate tag creation should fail", async () => {
    await api.functional.shoppingMall.admin.products.tags.create(connection, {
      productId: product.id,
      body: {
        shopping_mall_product_id: product.id,
        tag: tagValue, // duplicate
      } satisfies IShoppingMallProductTag.ICreate,
    });
  });

  // 8. Validate SEO/permissible tag value (alphanumeric, not empty)
  TestValidator.predicate("tag is non-empty", tag.tag.length > 0);
  TestValidator.predicate(
    "tag value is alphanumeric",
    /^[a-z0-9]+$/i.test(tag.tag),
  );
}
