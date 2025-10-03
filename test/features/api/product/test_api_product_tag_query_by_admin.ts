import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductTag";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallChannelCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannelCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductTag";
import type { IShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSection";

/**
 * Validate admin ability to paginate and filter product tags by PATCH
 * /shoppingMall/admin/products/{productId}/tags.
 *
 * Business flow:
 *
 * 1. Register and authenticate as admin
 * 2. Create a channel as admin
 * 3. Create a section under the channel
 * 4. Create a category for the channel
 * 5. Create a product referencing seller (admin as seller), channel, section, and
 *    category
 * 6. Search tags for the product when none exist (should be empty set/pagination
 *    edge)
 *
 * NOTE: The API contract does not expose tag creation, so only the empty tag
 * state can be validated here (pagination metadata and empty results). As soon
 * as a tag-creation endpoint is exposed, additional logic (filtering,
 * pagination, data assertion) should be added here to exercise full coverage.
 */
export async function test_api_product_tag_query_by_admin(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as admin
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(10),
      name: RandomGenerator.name(),
    },
  });
  typia.assert(admin);

  // 2. Create a channel
  const channel = await api.functional.shoppingMall.admin.channels.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph(),
      },
    },
  );
  typia.assert(channel);

  // 3. Create a section under the channel
  const section =
    await api.functional.shoppingMall.admin.channels.sections.create(
      connection,
      {
        channelId: channel.id,
        body: {
          shopping_mall_channel_id: channel.id,
          code: RandomGenerator.alphaNumeric(6),
          name: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          display_order: 0,
        },
      },
    );
  typia.assert(section);

  // 4. Create a category for the channel
  const category =
    await api.functional.shoppingMall.admin.channels.categories.create(
      connection,
      {
        channelId: channel.id,
        body: {
          shopping_mall_channel_id: channel.id,
          code: RandomGenerator.alphaNumeric(6),
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 1 }),
          display_order: 0,
        },
      },
    );
  typia.assert(category);

  // 5. Create a product referencing all
  const product = await api.functional.shoppingMall.admin.products.create(
    connection,
    {
      body: {
        shopping_mall_seller_id: admin.id,
        shopping_mall_channel_id: channel.id,
        shopping_mall_section_id: section.id,
        shopping_mall_category_id: category.id,
        code: RandomGenerator.alphaNumeric(12),
        name: RandomGenerator.paragraph({ sentences: 2 }),
        status: "Active",
        business_status: "Approval",
      },
    },
  );
  typia.assert(product);

  // 6. Search tags for the new product (should be empty)
  let tagsPage = await api.functional.shoppingMall.admin.products.tags.index(
    connection,
    {
      productId: product.id,
      body: {
        productId: product.id,
      },
    },
  );
  typia.assert(tagsPage);
  TestValidator.equals(
    "empty tag search should yield no data",
    tagsPage.data,
    [],
  );
  TestValidator.equals("pagination empty set", tagsPage.pagination.records, 0);
  TestValidator.equals("pagination page 1", tagsPage.pagination.current, 1);
}
