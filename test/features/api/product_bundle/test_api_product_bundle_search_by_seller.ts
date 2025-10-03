import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductBundle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductBundle";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallChannelCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannelCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductBundle } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductBundle";
import type { IShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSection";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validates seller's ability to search and paginate their own product bundles,
 * and enforces access control against others.
 *
 * 1. Create channel, section, category (admin operations assumed to be available)
 * 2. Register seller in the created channel/section
 * 3. Register a product as the seller, referencing the created
 *    channel/section/category
 * 4. (Cannot create bundles directly as no API for this is available)
 * 5. Attempt to list/search bundles for the product (should succeed for owner and
 *    fail for others)
 */
export async function test_api_product_bundle_search_by_seller(
  connection: api.IConnection,
) {
  // 1. Create channel
  const channel = await api.functional.shoppingMall.admin.channels.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
      } satisfies IShoppingMallChannel.ICreate,
    },
  );
  typia.assert(channel);

  // 2. Create section for the channel
  const section =
    await api.functional.shoppingMall.admin.channels.sections.create(
      connection,
      {
        channelId: channel.id,
        body: {
          shopping_mall_channel_id: channel.id,
          code: RandomGenerator.alphaNumeric(8),
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.content({ paragraphs: 1 }),
          display_order: 1,
        } satisfies IShoppingMallSection.ICreate,
      },
    );
  typia.assert(section);

  // 3. Create category for the channel
  const category =
    await api.functional.shoppingMall.admin.channels.categories.create(
      connection,
      {
        channelId: channel.id,
        body: {
          shopping_mall_channel_id: channel.id,
          code: RandomGenerator.alphaNumeric(8),
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.content({ paragraphs: 1 }),
          display_order: 1,
        } satisfies IShoppingMallChannelCategory.ICreate,
      },
    );
  typia.assert(category);

  // 4. Register seller for this channel/section
  const sellerEmail: string = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: RandomGenerator.alphaNumeric(15),
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      shopping_mall_channel_id: channel.id,
      shopping_mall_section_id: section.id,
      profile_name: RandomGenerator.name(),
      kyc_status: "pending",
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);
  // After join, connection has seller's auth (see SDK setHeader behavior)

  // 5. Register product under this seller
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        shopping_mall_seller_id: seller.id,
        shopping_mall_channel_id: channel.id,
        shopping_mall_section_id: section.id,
        shopping_mall_category_id: category.id,
        code: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.paragraph({ sentences: 2 }),
        status: "active",
        business_status: "active",
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);

  // 6. Search for bundles (no explicit bundle creation possible in provided SDK)
  const reqBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    search: undefined,
    bundle_type: undefined,
    sort_by: "position",
    sort_order: "asc",
  } satisfies IShoppingMallProductBundle.IRequest;
  const page = await api.functional.shoppingMall.seller.products.bundles.index(
    connection,
    {
      productId: product.id,
      body: reqBody,
    },
  );
  typia.assert(page);

  // Validate returned data is an array, and all records (if present) are for correct product
  TestValidator.predicate(
    "bundle data product id matches",
    page.data.every((bundle) => bundle.shopping_mall_product_id === product.id),
  );
  // Pagination core values
  TestValidator.equals(
    "pagination limit respected",
    page.pagination.limit,
    reqBody.limit,
  );
  TestValidator.predicate(
    "pagination page is 1",
    page.pagination.current === 1,
  );

  // Edge case: Seller cannot see bundles of another seller's product
  // Register a 2nd seller
  const otherSellerEmail: string = typia.random<
    string & tags.Format<"email">
  >();
  const otherSeller = await api.functional.auth.seller.join(connection, {
    body: {
      email: otherSellerEmail,
      password: RandomGenerator.alphaNumeric(15),
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      shopping_mall_channel_id: channel.id,
      shopping_mall_section_id: section.id,
      profile_name: RandomGenerator.name(),
      kyc_status: "pending",
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(otherSeller);

  // The connection now has other seller's credentials
  // Try listing bundles for the first seller's product - must error (forbidden)
  await TestValidator.error(
    "non-owner seller cannot view bundles of other seller's product",
    async () => {
      await api.functional.shoppingMall.seller.products.bundles.index(
        connection,
        {
          productId: product.id,
          body: reqBody,
        },
      );
    },
  );
}
