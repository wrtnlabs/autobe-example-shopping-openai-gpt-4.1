import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallChannelCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannelCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductContent";
import type { IShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSection";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validate seller fetches owned product content detail.
 *
 * 1. Create a channel
 * 2. Create a section
 * 3. Create a category
 * 4. Register and authenticate a seller scoped to channel/section
 * 5. Register a new product for this seller in the channel/section/category
 * 6. Fetch product content as the seller, verify all required fields
 * 7. Edge test: fetch content for nonexistent product id (should error)
 * 8. Edge test: fetch content for a product NOT owned by seller (should error)
 */
export async function test_api_seller_product_content_detail_fetch(
  connection: api.IConnection,
) {
  // 1. Create a channel
  const channelCreate = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IShoppingMallChannel.ICreate;
  const channel = await api.functional.shoppingMall.admin.channels.create(
    connection,
    {
      body: channelCreate,
    },
  );
  typia.assert(channel);

  // 2. Create a section
  const sectionCreate = {
    shopping_mall_channel_id: channel.id,
    code: RandomGenerator.alphaNumeric(6),
    name: RandomGenerator.name(1),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    display_order: typia.random<number & tags.Type<"int32">>(),
  } satisfies IShoppingMallSection.ICreate;
  const section =
    await api.functional.shoppingMall.admin.channels.sections.create(
      connection,
      {
        channelId: channel.id,
        body: sectionCreate,
      },
    );
  typia.assert(section);

  // 3. Create a category
  const categoryCreate = {
    shopping_mall_channel_id: channel.id,
    code: RandomGenerator.alphaNumeric(5),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    display_order: typia.random<number & tags.Type<"int32">>(),
  } satisfies IShoppingMallChannelCategory.ICreate;
  const category =
    await api.functional.shoppingMall.admin.channels.categories.create(
      connection,
      {
        channelId: channel.id,
        body: categoryCreate,
      },
    );
  typia.assert(category);

  // 4. Register & authenticate the seller
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerProfileName = RandomGenerator.name(2);
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: "1234",
      name: RandomGenerator.name(2),
      shopping_mall_channel_id: channel.id,
      shopping_mall_section_id: section.id,
      profile_name: sellerProfileName,
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);

  // 5. Register a new product for this seller
  const productCreate = {
    shopping_mall_seller_id: seller.id,
    shopping_mall_channel_id: channel.id,
    shopping_mall_section_id: section.id,
    shopping_mall_category_id: category.id,
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(2),
    status: "Active",
    business_status: "Approval",
  } satisfies IShoppingMallProduct.ICreate;
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: productCreate,
    },
  );
  typia.assert(product);

  // 6. Fetch the content of the product
  const productContent =
    await api.functional.shoppingMall.seller.products.content.at(connection, {
      productId: product.id,
    });
  typia.assert(productContent);
  TestValidator.predicate(
    "content_markdown is non-empty",
    productContent.content_markdown.length > 0,
  );
  TestValidator.predicate(
    "return_policy is non-empty",
    productContent.return_policy.length > 0,
  );
  TestValidator.predicate(
    "warranty_policy is non-empty",
    productContent.warranty_policy.length > 0,
  );
  TestValidator.predicate(
    "locale is non-empty",
    productContent.locale.length > 0,
  );

  // 7. Edge: fetch content of non-existent product
  await TestValidator.error(
    "fetching content for non-existent product should fail",
    async () => {
      await api.functional.shoppingMall.seller.products.content.at(connection, {
        productId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );

  // 8. Edge: fetch content for product not owned by seller
  // Register a different seller in the same channel/section
  const otherSeller = await api.functional.auth.seller.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "5678",
      name: RandomGenerator.name(2),
      shopping_mall_channel_id: channel.id,
      shopping_mall_section_id: section.id,
      profile_name: RandomGenerator.name(2),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(otherSeller);

  // Attempt to use otherSeller's session (simulate switch by using normal join flow)
  // (Assumption: Token auto-switch; otherwise, would require explicit login endpoint)
  await TestValidator.error(
    "other seller fetching product not owned should fail",
    async () => {
      await api.functional.shoppingMall.seller.products.content.at(connection, {
        productId: product.id,
      });
    },
  );
}
