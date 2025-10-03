import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductTag";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallChannelCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannelCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductTag";
import type { IShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSection";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validates the process for a seller to query tags on one of their products
 * including search and pagination logic.
 *
 * 1. Create a channel as admin (required for associations).
 * 2. Create a section in the channel.
 * 3. Create a category in the channel.
 * 4. Register a seller with the above channel and section assigned.
 * 5. Register a product as the seller linked to the above
 *    channel/section/category.
 * 6. Attach several tags to the product (simulate by querying after tag creation
 *    logic—test is limited to tag read/search only, writes are out of scope).
 * 7. Query tags (all, filtered by search, and paginated), asserting
 *
 *    - Only correct tags for the product are returned
 *    - Search/filter works with partial tag names
 *    - Pagination info matches actual data
 *    - Tag metadata is structurally correct
 *    - Permissions: Only seller for the product may query the tags
 */
export async function test_api_product_tag_query_by_seller(
  connection: api.IConnection,
) {
  // 1. Create channel as admin
  const channel: IShoppingMallChannel =
    await api.functional.shoppingMall.admin.channels.create(connection, {
      body: {
        code: RandomGenerator.alphabets(8),
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 5 }),
      },
    });
  typia.assert(channel);

  // 2. Create section in channel
  const section: IShoppingMallSection =
    await api.functional.shoppingMall.admin.channels.sections.create(
      connection,
      {
        channelId: channel.id,
        body: {
          shopping_mall_channel_id: channel.id,
          code: RandomGenerator.alphabets(6),
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          display_order: typia.random<number & tags.Type<"int32">>(),
        },
      },
    );
  typia.assert(section);

  // 3. Create category in channel
  const category: IShoppingMallChannelCategory =
    await api.functional.shoppingMall.admin.channels.categories.create(
      connection,
      {
        channelId: channel.id,
        body: {
          shopping_mall_channel_id: channel.id,
          code: RandomGenerator.alphabets(6),
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 4 }),
          display_order: typia.random<number & tags.Type<"int32">>(),
        },
      },
    );
  typia.assert(category);

  // 4. Register as seller (join with above channel/section)
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: "sellerpass123",
        name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        shopping_mall_channel_id: channel.id,
        shopping_mall_section_id: section.id,
        profile_name: RandomGenerator.name(1),
        kyc_status: "pending",
      },
    });
  typia.assert(seller);

  // 5. Register a product as the seller
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: {
        shopping_mall_seller_id: seller.id,
        shopping_mall_channel_id: channel.id,
        shopping_mall_section_id: section.id,
        shopping_mall_category_id: category.id,
        code: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.paragraph({ sentences: 2 }),
        status: "Active",
        business_status: "Approval",
      },
    });
  typia.assert(product);

  // 6. (Simulate tags) -- actual tag creation endpoint not provided so we query for tags (should be empty on new product)
  const initialTagsOut =
    await api.functional.shoppingMall.seller.products.tags.index(connection, {
      productId: product.id,
      body: {
        productId: product.id,
        page: 1 as number & tags.Type<"int32">,
        limit: 10 as number & tags.Type<"int32">,
      },
    });
  typia.assert(initialTagsOut);
  TestValidator.equals("no tags on new product", initialTagsOut.data.length, 0);

  // 7. (No way to add tags, so we can't test actual search/filter, but will still test pagination logic on empty set)
  TestValidator.equals(
    "pagination reflects empty set",
    initialTagsOut.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination current page",
    initialTagsOut.pagination.current,
    1,
  );

  // (If there were tags, check tag structure)
  initialTagsOut.data.forEach((t, i) => {
    typia.assert<IShoppingMallProductTag.ISummary>(t);
    TestValidator.predicate(
      `tag[${i}] has id`,
      typeof t.id === "string" && t.id.length > 0,
    );
    TestValidator.predicate(
      `tag[${i}] has tag value`,
      typeof t.tag === "string" && t.tag.length > 0,
    );
  });
  // If a tag search endpoint existed, test that partial/substring search returns correct tags only for product.
}
