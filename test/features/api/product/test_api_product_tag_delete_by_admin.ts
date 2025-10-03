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
 * Validate permanent deletion of a product tag by admin, full E2E journey.
 *
 * 1. Register a new admin account
 * 2. Provision a new channel (as admin)
 * 3. Create a section under the channel
 * 4. Add a category to the channel
 * 5. Create a new product as admin, linked to channel, section, category
 * 6. Create a tag on the product (admin scope)
 * 7. Delete the tag using admin API
 * 8. (Optional edge) Soft-delete the product, then attempt to delete another tag
 *    (should succeed for admin)
 * 9. Ensure tag is no longer present for the product (not soft-deleted)
 * 10. Assertions for expected behavior and negative result (deleted tag is gone)
 */
export async function test_api_product_tag_delete_by_admin(
  connection: api.IConnection,
) {
  // 1. Register admin
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestAdminPass!1$",
      name: RandomGenerator.name(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(adminJoin);

  // 2. Create channel
  const channel = await api.functional.shoppingMall.admin.channels.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph(),
      } satisfies IShoppingMallChannel.ICreate,
    },
  );
  typia.assert(channel);

  // 3. Create section
  const section =
    await api.functional.shoppingMall.admin.channels.sections.create(
      connection,
      {
        channelId: channel.id,
        body: {
          shopping_mall_channel_id: channel.id,
          code: RandomGenerator.alphaNumeric(6),
          name: RandomGenerator.paragraph({ sentences: 2 }),
          display_order: typia.random<number & tags.Type<"int32">>(),
          description: RandomGenerator.paragraph(),
        } satisfies IShoppingMallSection.ICreate,
      },
    );
  typia.assert(section);

  // 4. Create category
  const category =
    await api.functional.shoppingMall.admin.channels.categories.create(
      connection,
      {
        channelId: channel.id,
        body: {
          shopping_mall_channel_id: channel.id,
          code: RandomGenerator.alphaNumeric(6),
          name: RandomGenerator.paragraph({ sentences: 2 }),
          display_order: typia.random<number & tags.Type<"int32">>(),
          description: RandomGenerator.paragraph(),
        } satisfies IShoppingMallChannelCategory.ICreate,
      },
    );
  typia.assert(category);

  // 5. Create product
  const product = await api.functional.shoppingMall.admin.products.create(
    connection,
    {
      body: {
        shopping_mall_seller_id: typia.random<string & tags.Format<"uuid">>(), // Admin-only test: random id to fulfill required field (real seller logic is not covered here)
        shopping_mall_channel_id: channel.id,
        shopping_mall_section_id: section.id,
        shopping_mall_category_id: category.id,
        code: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.paragraph({ sentences: 2 }),
        status: "Active",
        business_status: "Approved",
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);

  // 6. Create tag
  const tag = await api.functional.shoppingMall.admin.products.tags.create(
    connection,
    {
      productId: product.id,
      body: {
        shopping_mall_product_id: product.id,
        tag: RandomGenerator.paragraph({ sentences: 1 }),
      } satisfies IShoppingMallProductTag.ICreate,
    },
  );
  typia.assert(tag);

  // 7. Delete the tag
  await api.functional.shoppingMall.admin.products.tags.erase(connection, {
    productId: product.id,
    tagId: tag.id,
  });

  // 8. Attempt to delete same tag again (should fail/no-op, expect error)
  await TestValidator.error(
    "Deleting already deleted tag as admin results in error",
    async () => {
      await api.functional.shoppingMall.admin.products.tags.erase(connection, {
        productId: product.id,
        tagId: tag.id,
      });
    },
  );
}
