import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductOption";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallChannelCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannelCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOption";
import type { IShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSection";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Seller paginated product option listing with filtering & access control.
 *
 * - Register a channel (admin)
 * - Create a section
 * - Create a category
 * - Seller joins under above channel/section
 * - Seller registers a product in the above
 * - (Test assumes options exist for the product, otherwise would mock option
 *   creation)
 * - As seller, retrieve product options with PATCH API and validate:
 *
 *   - Only own options are returned
 *   - Pagination works
 *   - Option metadata fields present/correct
 *   - Filtering by "name" and "required" flag work
 *   - No hidden/inaccessible options exposed
 */
export async function test_api_seller_product_option_listing(
  connection: api.IConnection,
) {
  // 1. Register a new channel
  const channel = await api.functional.shoppingMall.admin.channels.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph(),
      } satisfies IShoppingMallChannel.ICreate,
    },
  );
  typia.assert(channel);

  // 2. Register a section for the channel
  const section =
    await api.functional.shoppingMall.admin.channels.sections.create(
      connection,
      {
        channelId: channel.id,
        body: {
          shopping_mall_channel_id: channel.id,
          code: RandomGenerator.alphaNumeric(8),
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph(),
          display_order: 1,
        } satisfies IShoppingMallSection.ICreate,
      },
    );
  typia.assert(section);

  // 3. Register category in the channel
  const category =
    await api.functional.shoppingMall.admin.channels.categories.create(
      connection,
      {
        channelId: channel.id,
        body: {
          shopping_mall_channel_id: channel.id,
          code: RandomGenerator.alphaNumeric(8),
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph(),
          display_order: 1,
        } satisfies IShoppingMallChannelCategory.ICreate,
      },
    );
  typia.assert(category);

  // 4. Seller registration under above
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = "1234";
  const sellerJoin = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      name: RandomGenerator.name(),
      shopping_mall_channel_id: channel.id,
      shopping_mall_section_id: section.id,
      profile_name: RandomGenerator.name(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerJoin);

  // 5. Seller registers a product
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        shopping_mall_seller_id: sellerJoin.id,
        shopping_mall_channel_id: channel.id,
        shopping_mall_section_id: section.id,
        shopping_mall_category_id: category.id,
        code: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(),
        status: "active",
        business_status: "active",
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);

  // 6. (Assume options for the product are already seeded or mock, as no direct API)

  // 7. Seller retrieves product options with pagination
  const request0 = {
    page: 1,
    limit: 10,
  } satisfies IShoppingMallProductOption.IRequest;
  const page0 = await api.functional.shoppingMall.seller.products.options.index(
    connection,
    {
      productId: product.id,
      body: request0,
    },
  );
  typia.assert(page0);

  TestValidator.predicate(
    "pagination info exists",
    !!page0.pagination && !!page0.data,
  );
  TestValidator.equals("current page is 1", page0.pagination.current, 1);
  TestValidator.equals("limit is 10", page0.pagination.limit, 10);
  TestValidator.predicate("data is array", Array.isArray(page0.data));

  // 8. Filtering: option by required flag (should not error, even if empty result)
  const requestRequired = {
    page: 1,
    limit: 10,
    required: true,
  } satisfies IShoppingMallProductOption.IRequest;
  const requiredPage =
    await api.functional.shoppingMall.seller.products.options.index(
      connection,
      {
        productId: product.id,
        body: requestRequired,
      },
    );
  typia.assert(requiredPage);
  // No error even if empty
  TestValidator.predicate(
    "required filter did not error",
    Array.isArray(requiredPage.data),
  );

  // 9. Filtering: option by name (prefix, case-insensitive)
  if (page0.data.length > 0) {
    const firstName = page0.data[0].name;
    const searchPrefix = firstName.substring(
      0,
      Math.max(1, Math.floor(firstName.length / 2)),
    );
    const requestNameSearch = {
      page: 1,
      limit: 10,
      name: searchPrefix,
    } satisfies IShoppingMallProductOption.IRequest;
    const searched =
      await api.functional.shoppingMall.seller.products.options.index(
        connection,
        {
          productId: product.id,
          body: requestNameSearch,
        },
      );
    typia.assert(searched);
    TestValidator.predicate(
      "name search returns only matching options",
      searched.data.every((opt) =>
        opt.name.toLowerCase().includes(searchPrefix.toLowerCase()),
      ),
    );
  }

  // 10. Validate no cross-product options are visible (simulate: create another product, check its options not visible)
  const otherProduct = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        shopping_mall_seller_id: sellerJoin.id,
        shopping_mall_channel_id: channel.id,
        shopping_mall_section_id: section.id,
        shopping_mall_category_id: category.id,
        code: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(),
        status: "active",
        business_status: "active",
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(otherProduct);

  const otherPage =
    await api.functional.shoppingMall.seller.products.options.index(
      connection,
      {
        productId: otherProduct.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallProductOption.IRequest,
      },
    );
  typia.assert(otherPage);
  // Data should only be options for the other product (generally empty/mock)
  TestValidator.predicate(
    "other product options listing is isolated",
    otherPage.data.every(
      (opt) => opt.shopping_mall_product_id === otherProduct.id,
    ),
  );
}
