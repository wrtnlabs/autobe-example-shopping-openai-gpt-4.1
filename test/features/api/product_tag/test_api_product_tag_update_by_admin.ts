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
 * Validates updating a product tag by an admin including uniqueness and
 * validation constraints.
 *
 * 1. Register a new admin and authenticate.
 * 2. Create a new channel as admin.
 * 3. Create a section in the channel.
 * 4. Create a category in the channel.
 * 5. Register a new product in the created channel, section, and category.
 * 6. Attach a product tag to the product.
 * 7. Update the product tag value.
 * 8. Confirm the tag is updated.
 * 9. Attempt to update the tag to a duplicate value (should fail).
 * 10. (Optional) Attempt to update with invalid value (such as blank, if business
 *     rules allow).
 */
export async function test_api_product_tag_update_by_admin(
  connection: api.IConnection,
) {
  // 1. Register and authenticate admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminName = RandomGenerator.name();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "Admin#12345!",
        name: adminName,
      } satisfies IShoppingMallAdmin.IJoin,
    });
  typia.assert(admin);

  // 2. Create channel
  const channel: IShoppingMallChannel =
    await api.functional.shoppingMall.admin.channels.create(connection, {
      body: {
        code: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph(),
      } satisfies IShoppingMallChannel.ICreate,
    });
  typia.assert(channel);

  // 3. Create section in channel
  const section: IShoppingMallSection =
    await api.functional.shoppingMall.admin.channels.sections.create(
      connection,
      {
        channelId: channel.id,
        body: {
          shopping_mall_channel_id: channel.id,
          code: RandomGenerator.alphaNumeric(6),
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph(),
          display_order: 1,
        } satisfies IShoppingMallSection.ICreate,
      },
    );
  typia.assert(section);

  // 4. Create category in channel
  const category: IShoppingMallChannelCategory =
    await api.functional.shoppingMall.admin.channels.categories.create(
      connection,
      {
        channelId: channel.id,
        body: {
          shopping_mall_channel_id: channel.id,
          code: RandomGenerator.alphaNumeric(6),
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph(),
          display_order: 1,
        } satisfies IShoppingMallChannelCategory.ICreate,
      },
    );
  typia.assert(category);

  // 5. Register product
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.admin.products.create(connection, {
      body: {
        shopping_mall_seller_id: admin.id,
        shopping_mall_channel_id: channel.id,
        shopping_mall_section_id: section.id,
        shopping_mall_category_id: category.id,
        code: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(),
        status: "Active",
        business_status: "Approved",
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(product);

  // 6. Attach tag
  const initialTagLabel = RandomGenerator.paragraph({ sentences: 1 });
  const tag: IShoppingMallProductTag =
    await api.functional.shoppingMall.admin.products.tags.create(connection, {
      productId: product.id,
      body: {
        shopping_mall_product_id: product.id,
        tag: initialTagLabel,
      } satisfies IShoppingMallProductTag.ICreate,
    });
  typia.assert(tag);

  // 7. Update tag to a new unique value
  const updatedTagLabel = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 8,
    wordMax: 12,
  });
  const updatedTag: IShoppingMallProductTag =
    await api.functional.shoppingMall.admin.products.tags.update(connection, {
      productId: product.id,
      tagId: tag.id,
      body: {
        tag: updatedTagLabel,
      } satisfies IShoppingMallProductTag.IUpdate,
    });
  typia.assert(updatedTag);
  TestValidator.equals("Tag is updated", updatedTag.tag, updatedTagLabel);

  // 8. Attempt duplicate tag – create another tag with different label, update existing to duplicate
  const secondTagLabel = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 7,
    wordMax: 11,
  });
  const secondTag: IShoppingMallProductTag =
    await api.functional.shoppingMall.admin.products.tags.create(connection, {
      productId: product.id,
      body: {
        shopping_mall_product_id: product.id,
        tag: secondTagLabel,
      } satisfies IShoppingMallProductTag.ICreate,
    });
  typia.assert(secondTag);

  await TestValidator.error(
    "Updating a tag to duplicate value for the same product must fail",
    async () => {
      await api.functional.shoppingMall.admin.products.tags.update(connection, {
        productId: product.id,
        tagId: updatedTag.id,
        body: {
          tag: secondTagLabel,
        } satisfies IShoppingMallProductTag.IUpdate,
      });
    },
  );

  // 9. Optionally: try invalid tag value (empty tag)
  await TestValidator.error(
    "Blank tag string must not be allowed",
    async () => {
      await api.functional.shoppingMall.admin.products.tags.update(connection, {
        productId: product.id,
        tagId: updatedTag.id,
        body: {
          tag: "",
        } satisfies IShoppingMallProductTag.IUpdate,
      });
    },
  );
}
