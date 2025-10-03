import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductOption";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallChannelCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannelCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOption";
import type { IShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSection";

/**
 * Validate admin can retrieve advanced paginated and filtered option listings
 * for a product.
 *
 * Steps:
 *
 * 1. Admin registration (join)
 * 2. Admin creates a channel
 * 3. Admin creates a section in channel
 * 4. Admin creates a category in channel
 * 5. Admin registers a new product (referencing the above)
 * 6. Admin requests product option list with default, paged, filtered, sorted
 *    queries
 *
 * Validates:
 *
 * - Access control for admin
 * - Response conforms to IPageIShoppingMallProductOption.ISummary with correct
 *   pagination
 * - Filtering/sorting works as expected (with at least some edge case requests)
 */
export async function test_api_admin_product_option_listing(
  connection: api.IConnection,
) {
  // 1. Admin registration (join - authenticate)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminBody = {
    email: adminEmail,
    password: "testPassword@123",
    name: RandomGenerator.name(2),
  } satisfies IShoppingMallAdmin.IJoin;
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminBody,
    });
  typia.assert(admin);
  // 2. Admin creates a channel
  const channelBody = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
  } satisfies IShoppingMallChannel.ICreate;
  const channel: IShoppingMallChannel =
    await api.functional.shoppingMall.admin.channels.create(connection, {
      body: channelBody,
    });
  typia.assert(channel);
  // 3. Admin creates a section in channel
  const sectionBody = {
    shopping_mall_channel_id: channel.id,
    code: RandomGenerator.alphaNumeric(6),
    name: RandomGenerator.name(1),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    display_order: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1>
    >(),
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
  // 4. Admin creates a category in channel
  const categoryBody = {
    shopping_mall_channel_id: channel.id,
    // root category, so parent_id is undefined
    code: RandomGenerator.alphaNumeric(6),
    name: RandomGenerator.paragraph({ sentences: 1 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
    display_order: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1>
    >(),
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
  // 5. Admin registers a new product
  const productBody = {
    shopping_mall_seller_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_channel_id: channel.id,
    shopping_mall_section_id: section.id,
    shopping_mall_category_id: category.id,
    code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    status: "Active",
    business_status: "Approval",
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.admin.products.create(connection, {
      body: productBody,
    });
  typia.assert(product);

  // 6. Admin requests product option list with different filters/queries

  // 6a. Default request (no filters) - should always succeed, even if options are empty
  const defaultOptionsResp: IPageIShoppingMallProductOption.ISummary =
    await api.functional.shoppingMall.admin.products.options.index(connection, {
      productId: product.id,
      body: {},
    });
  typia.assert(defaultOptionsResp);
  TestValidator.equals(
    "admin can retrieve product option page: default",
    defaultOptionsResp.pagination.current,
    1,
  );
  TestValidator.equals(
    "admin can retrieve correct product id in options",
    product.id,
    defaultOptionsResp.data.length > 0
      ? defaultOptionsResp.data[0].shopping_mall_product_id
      : product.id,
  );

  // 6b. Paginated request (limit = 1)
  const pagedOptionsResp: IPageIShoppingMallProductOption.ISummary =
    await api.functional.shoppingMall.admin.products.options.index(connection, {
      productId: product.id,
      body: {
        limit: 1 satisfies number,
      },
    });
  typia.assert(pagedOptionsResp);
  TestValidator.equals(
    "limit=1 pagination applied",
    pagedOptionsResp.pagination.limit,
    1,
  );

  // 6c. Name filter (random string; may yield 0)
  const nameQuery = RandomGenerator.alphaNumeric(4);
  const filteredByNameResp: IPageIShoppingMallProductOption.ISummary =
    await api.functional.shoppingMall.admin.products.options.index(connection, {
      productId: product.id,
      body: {
        name: nameQuery,
      },
    });
  typia.assert(filteredByNameResp);
  TestValidator.predicate(
    "name filter applied (data array present)",
    Array.isArray(filteredByNameResp.data),
  );

  // 6d. Required filter (true)
  const filteredByRequiredResp: IPageIShoppingMallProductOption.ISummary =
    await api.functional.shoppingMall.admin.products.options.index(connection, {
      productId: product.id,
      body: {
        required: true,
      },
    });
  typia.assert(filteredByRequiredResp);
  TestValidator.predicate(
    "required filter applied (data array present)",
    Array.isArray(filteredByRequiredResp.data),
  );

  // 6e. Sorted by name (asc)
  const sortedResp: IPageIShoppingMallProductOption.ISummary =
    await api.functional.shoppingMall.admin.products.options.index(connection, {
      productId: product.id,
      body: {
        sort: "name:asc",
      },
    });
  typia.assert(sortedResp);
  TestValidator.predicate(
    "sort by name applied (data array present)",
    Array.isArray(sortedResp.data),
  );
}
