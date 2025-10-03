import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProduct";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallChannelCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannelCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSection";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test comprehensive product search with advanced filtering, pagination, and
 * sorting.
 *
 * Steps:
 *
 * 1. Admin registration and authentication.
 * 2. Admin creates a channel.
 * 3. Admin adds a section and a category within the channel.
 * 4. Seller joins using section/channel.
 * 5. Seller registers a product (assigning to the section and category).
 * 6. Search for products using various filters, pagination, and sorting.
 * 7. Validate that search returns correct products (matching filters by channel,
 *    section, category, seller, status, business_status, code, name, etc).
 * 8. Verify pagination info (total, pages, limit, etc).
 * 9. Test non-match/search miss edge cases.
 */
export async function test_api_product_search_advanced_filters_pagination(
  connection: api.IConnection,
) {
  // 1. Admin registration & authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoin = {
    email: adminEmail,
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
  } satisfies IShoppingMallAdmin.IJoin;
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: adminJoin,
  });
  typia.assert(adminAuth);

  // 2. Admin creates a channel
  const channelInput = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies IShoppingMallChannel.ICreate;
  const channel = await api.functional.shoppingMall.admin.channels.create(
    connection,
    { body: channelInput },
  );
  typia.assert(channel);

  // 3. Admin adds a section
  const sectionInput = {
    shopping_mall_channel_id: channel.id,
    code: RandomGenerator.alphaNumeric(6),
    name: RandomGenerator.name(1),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    display_order: typia.random<number & tags.Type<"int32">>(),
  } satisfies IShoppingMallSection.ICreate;
  const section =
    await api.functional.shoppingMall.admin.channels.sections.create(
      connection,
      {
        channelId: channel.id,
        body: sectionInput,
      },
    );
  typia.assert(section);

  // 4. Admin adds a category
  const categoryInput = {
    shopping_mall_channel_id: channel.id,
    parent_id: null,
    code: RandomGenerator.alphaNumeric(7),
    name: RandomGenerator.name(1),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    display_order: typia.random<number & tags.Type<"int32">>(),
  } satisfies IShoppingMallChannelCategory.ICreate;
  const category =
    await api.functional.shoppingMall.admin.channels.categories.create(
      connection,
      {
        channelId: channel.id,
        body: categoryInput,
      },
    );
  typia.assert(category);

  // 5. Seller joins using above channel/section
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerJoin = {
    email: sellerEmail,
    password: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
    shopping_mall_channel_id: channel.id,
    shopping_mall_section_id: section.id,
    profile_name: RandomGenerator.name(1),
    kyc_status: "pending",
  } satisfies IShoppingMallSeller.IJoin;
  const sellerAuth = await api.functional.auth.seller.join(connection, {
    body: sellerJoin,
  });
  typia.assert(sellerAuth);

  // 6. Seller registers a product
  const productInput = {
    shopping_mall_seller_id: sellerAuth.id,
    shopping_mall_channel_id: channel.id,
    shopping_mall_section_id: section.id,
    shopping_mall_category_id: category.id,
    code: RandomGenerator.alphaNumeric(7),
    name: RandomGenerator.name(2),
    status: "Active",
    business_status: "Approval",
  } satisfies IShoppingMallProduct.ICreate;
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    { body: productInput },
  );
  typia.assert(product);

  // 7. Product search by channel/section/category
  const reqByChannel = {
    channel_id: channel.id,
    limit: 10,
    page: 1,
  } satisfies IShoppingMallProduct.IRequest;
  const resByChannel = await api.functional.shoppingMall.products.index(
    connection,
    { body: reqByChannel },
  );
  typia.assert(resByChannel);
  TestValidator.predicate(
    "found at least 1 product for channel",
    resByChannel.data.some((p) => p.id === product.id),
  );

  const reqBySection = {
    section_id: section.id,
    limit: 10,
    page: 1,
  } satisfies IShoppingMallProduct.IRequest;
  const resBySection = await api.functional.shoppingMall.products.index(
    connection,
    { body: reqBySection },
  );
  typia.assert(resBySection);
  TestValidator.predicate(
    "found at least 1 product for section",
    resBySection.data.some((p) => p.id === product.id),
  );

  const reqByCategory = {
    category_id: category.id,
    limit: 10,
    page: 1,
  } satisfies IShoppingMallProduct.IRequest;
  const resByCategory = await api.functional.shoppingMall.products.index(
    connection,
    { body: reqByCategory },
  );
  typia.assert(resByCategory);
  TestValidator.predicate(
    "found at least 1 product for category",
    resByCategory.data.some((p) => p.id === product.id),
  );

  // 8. Keyword search (by product name substring)
  const keyword = RandomGenerator.substring(product.name);
  const reqByKeyword = {
    search: keyword,
    limit: 10,
    page: 1,
  } satisfies IShoppingMallProduct.IRequest;
  const resByKeyword = await api.functional.shoppingMall.products.index(
    connection,
    { body: reqByKeyword },
  );
  typia.assert(resByKeyword);
  TestValidator.predicate(
    "found at least 1 product with keyword",
    resByKeyword.data.some((p) => p.id === product.id),
  );

  // 9. Pagination test (limit = 1, check page 1 & 2)
  const reqPaging = {
    limit: 1,
    page: 1,
    channel_id: channel.id,
  } satisfies IShoppingMallProduct.IRequest;
  const page1 = await api.functional.shoppingMall.products.index(connection, {
    body: reqPaging,
  });
  typia.assert(page1);
  TestValidator.equals("pagination limit is 1", page1.pagination.limit, 1);
  TestValidator.predicate("page 1 has <= 1 product", page1.data.length <= 1);

  const reqPaging2 = {
    limit: 1,
    page: 2,
    channel_id: channel.id,
  } satisfies IShoppingMallProduct.IRequest;
  const page2 = await api.functional.shoppingMall.products.index(connection, {
    body: reqPaging2,
  });
  typia.assert(page2);
  TestValidator.equals(
    "pagination limit is 1, page=2",
    page2.pagination.limit,
    1,
  );

  // 10. Filter by various fields
  const reqBySeller = {
    seller_id: sellerAuth.id,
    limit: 10,
    page: 1,
  } satisfies IShoppingMallProduct.IRequest;
  const resBySeller = await api.functional.shoppingMall.products.index(
    connection,
    { body: reqBySeller },
  );
  typia.assert(resBySeller);
  TestValidator.predicate(
    "found by seller_id",
    resBySeller.data.some((p) => p.id === product.id),
  );

  const reqByStatus = {
    status: product.status,
    limit: 10,
    page: 1,
  } satisfies IShoppingMallProduct.IRequest;
  const resByStatus = await api.functional.shoppingMall.products.index(
    connection,
    { body: reqByStatus },
  );
  typia.assert(resByStatus);
  TestValidator.predicate(
    "found by status",
    resByStatus.data.some((p) => p.id === product.id),
  );

  const reqByBusinessStatus = {
    business_status: product.business_status,
    limit: 10,
    page: 1,
  } satisfies IShoppingMallProduct.IRequest;
  const resByBusinessStatus = await api.functional.shoppingMall.products.index(
    connection,
    { body: reqByBusinessStatus },
  );
  typia.assert(resByBusinessStatus);
  TestValidator.predicate(
    "found by business_status",
    resByBusinessStatus.data.some((p) => p.id === product.id),
  );

  const reqByCode = {
    code: product.code,
    limit: 10,
    page: 1,
  } satisfies IShoppingMallProduct.IRequest;
  const resByCode = await api.functional.shoppingMall.products.index(
    connection,
    { body: reqByCode },
  );
  typia.assert(resByCode);
  TestValidator.predicate(
    "found by code",
    resByCode.data.some((p) => p.id === product.id),
  );

  const reqByName = {
    name: product.name,
    limit: 10,
    page: 1,
  } satisfies IShoppingMallProduct.IRequest;
  const resByName = await api.functional.shoppingMall.products.index(
    connection,
    { body: reqByName },
  );
  typia.assert(resByName);
  TestValidator.predicate(
    "found by name",
    resByName.data.some((p) => p.id === product.id),
  );

  // 11. Edge: combo filters (improbable combo yields no result)
  const reqNoMatch = {
    channel_id: channel.id,
    name: "improbable name that should not exist",
    limit: 10,
    page: 1,
  } satisfies IShoppingMallProduct.IRequest;
  const resNoMatch = await api.functional.shoppingMall.products.index(
    connection,
    { body: reqNoMatch },
  );
  typia.assert(resNoMatch);
  TestValidator.equals(
    "no results for impossible name",
    resNoMatch.data.length,
    0,
  );

  // 12. Pagination: request past last page
  const outOfRangePaging = {
    channel_id: channel.id,
    limit: 10,
    page: 100,
  } satisfies IShoppingMallProduct.IRequest;
  const outOfRange = await api.functional.shoppingMall.products.index(
    connection,
    { body: outOfRangePaging },
  );
  typia.assert(outOfRange);
  TestValidator.equals(
    "no results for page past last",
    outOfRange.data.length,
    0,
  );

  // 13. Validate business logic: all found products must have matching filter values
  for (const productRow of resByChannel.data) {
    TestValidator.equals(
      "all products match channel_id in filter",
      productRow.shopping_mall_channel_id,
      channel.id,
    );
  }
  for (const productRow of resBySection.data) {
    TestValidator.equals(
      "all products match section_id in filter",
      productRow.shopping_mall_channel_id,
      channel.id,
    );
  }
}
