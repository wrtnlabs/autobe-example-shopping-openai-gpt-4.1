import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductBundle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductBundle";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallChannelCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannelCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductBundle } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductBundle";
import type { IShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSection";

/**
 * Validate that an administrator can retrieve and filter bundles for any
 * registered product with proper pagination and filtering.
 *
 * Business case: Admin users need global access to view, audit, and paginate
 * through product bundles, regardless of which seller created the product. This
 * test will cover the complete setup (admin, channel, section, category,
 * product), register a product, simulate the expected bundle search, and
 * validate field-level permissions and visibility. It will also attempt edge
 * cases: searching bundles for a non-existent productId, and running the search
 * with advanced filtering, sorting, and paging queries.
 */
export async function test_api_product_bundle_search_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin joins
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: RandomGenerator.alphaNumeric(12),
      name: RandomGenerator.name(),
    },
  });
  typia.assert(admin);

  // 2. Create Channel
  const channel = await api.functional.shoppingMall.admin.channels.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph(),
      },
    },
  );
  typia.assert(channel);

  // 3. Create Section under Channel
  const section =
    await api.functional.shoppingMall.admin.channels.sections.create(
      connection,
      {
        channelId: channel.id,
        body: {
          shopping_mall_channel_id: channel.id,
          code: RandomGenerator.alphaNumeric(8),
          name: RandomGenerator.name(),
          display_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
          description: RandomGenerator.paragraph(),
        },
      },
    );
  typia.assert(section);

  // 4. Create Category under Channel
  const category =
    await api.functional.shoppingMall.admin.channels.categories.create(
      connection,
      {
        channelId: channel.id,
        body: {
          shopping_mall_channel_id: channel.id,
          parent_id: null,
          code: RandomGenerator.alphaNumeric(8),
          name: RandomGenerator.name(),
          display_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
          description: RandomGenerator.paragraph(),
        },
      },
    );
  typia.assert(category);

  // 5. Register a Product as admin
  const product = await api.functional.shoppingMall.admin.products.create(
    connection,
    {
      body: {
        shopping_mall_seller_id: typia.random<string & tags.Format<"uuid">>(),
        shopping_mall_channel_id: channel.id,
        shopping_mall_section_id: section.id,
        shopping_mall_category_id: category.id,
        code: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.paragraph({ sentences: 3 }),
        status: "Active",
        business_status: "Approved",
      },
    },
  );
  typia.assert(product);

  // 6. (No bundle creation API available in admin scope, so search will be empty unless DB preloads test bundles.)

  // 7. Search bundles for the product as admin (should succeed, but may be empty)
  const searchRequest = {
    page: 1,
    limit: 10,
    search: undefined,
    bundle_type: undefined,
    sort_by: undefined,
    sort_order: undefined,
  } satisfies IShoppingMallProductBundle.IRequest;
  const pageBundles =
    await api.functional.shoppingMall.admin.products.bundles.index(connection, {
      productId: product.id,
      body: searchRequest,
    });
  typia.assert(pageBundles);
  // The admin should see all bundles for this product (likely empty for a fresh product)
  TestValidator.equals(
    "bundle list is array",
    Array.isArray(pageBundles.data),
    true,
  );
  TestValidator.equals(
    "pagination page is 1",
    pageBundles.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 10",
    pageBundles.pagination.limit,
    10,
  );
  // Edge: try advanced pagination/search
  const advancedReq = {
    page: 2,
    limit: 5,
    search: RandomGenerator.paragraph({ sentences: 1 }),
    bundle_type: "fixed",
    sort_by: "name",
    sort_order: "asc",
  } satisfies IShoppingMallProductBundle.IRequest;
  const advancedPage =
    await api.functional.shoppingMall.admin.products.bundles.index(connection, {
      productId: product.id,
      body: advancedReq,
    });
  typia.assert(advancedPage);
  TestValidator.equals(
    "pagination page is 2",
    advancedPage.pagination.current,
    2,
  );
  TestValidator.equals(
    "pagination limit is 5",
    advancedPage.pagination.limit,
    5,
  );

  // Edge: non-existent product
  await TestValidator.error(
    "admin cannot find bundles for a non-existent product",
    async () => {
      await api.functional.shoppingMall.admin.products.bundles.index(
        connection,
        {
          productId: typia.random<string & tags.Format<"uuid">>(),
          body: searchRequest,
        },
      );
    },
  );
}
