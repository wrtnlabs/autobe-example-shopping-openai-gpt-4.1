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
 * Validate the seller product content update API with business logic,
 * permissions, and typical error conditions.
 *
 * 1. Register a seller using typia.random values for IShoppingMallSeller.IJoin,
 *    store authorized info.
 * 2. As an admin, create a shopping mall channel (code, name, description
 *    nullable).
 * 3. As an admin, create a section in the channel with code, name, and
 *    display_order.
 * 4. As an admin, create a category in the channel with code, name, and
 *    display_order (parent_id nullable).
 * 5. As that seller, register a product referencing the seller, created channel,
 *    section, and category.
 * 6. Use api.functional.shoppingMall.seller.products.content.update to update the
 *    product's content (content_markdown, return_policy, warranty_policy, and
 *    locale), and check that the result matches.
 * 7. Negative: Attempt update with another seller who does not own the product and
 *    confirm error thrown with TestValidator.error (async, with await).
 * 8. Negative: Soft-delete (simulate by setting product status to 'deleted' via
 *    update object and API if possible, else skip), then attempt content update
 *    and check for failure (with TestValidator.error).
 *
 * All variables and request bodies use correct type tags and use typia.random
 * or RandomGenerator utilities as needed.
 *
 * Permissions are enforced on the seller/product relationship; type validation
 * is enforced by typia.assert.
 */
export async function test_api_seller_product_content_update(
  connection: api.IConnection,
) {
  // 1. Register seller (primary/owner)
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    shopping_mall_channel_id: "", // will fill in after channel creation
    shopping_mall_section_id: "", // will fill in
    profile_name: RandomGenerator.paragraph({ sentences: 2 }),
    kyc_status: "pending",
  } satisfies IShoppingMallSeller.IJoin;

  // 2. Create Channel
  const channel = await api.functional.shoppingMall.admin.channels.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphabets(8),
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
      } satisfies IShoppingMallChannel.ICreate,
    },
  );
  typia.assert(channel);

  // 3. Create Section in Channel
  const section =
    await api.functional.shoppingMall.admin.channels.sections.create(
      connection,
      {
        channelId: channel.id,
        body: {
          shopping_mall_channel_id: channel.id,
          code: RandomGenerator.alphabets(6),
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.content({ paragraphs: 1 }),
          display_order: typia.random<number & tags.Type<"int32">>(),
        } satisfies IShoppingMallSection.ICreate,
      },
    );
  typia.assert(section);

  // 4. Create Category in Channel
  const category =
    await api.functional.shoppingMall.admin.channels.categories.create(
      connection,
      {
        channelId: channel.id,
        body: {
          shopping_mall_channel_id: channel.id,
          parent_id: null,
          code: RandomGenerator.alphabets(5),
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.content({ paragraphs: 1 }),
          display_order: typia.random<number & tags.Type<"int32">>(),
        } satisfies IShoppingMallChannelCategory.ICreate,
      },
    );
  typia.assert(category);

  // 1b. Now register seller with correct channel/section filled in
  sellerJoinBody.shopping_mall_channel_id = channel.id;
  sellerJoinBody.shopping_mall_section_id = section.id;
  const sellerAuth = await api.functional.auth.seller.join(connection, {
    body: sellerJoinBody,
  });
  typia.assert(sellerAuth);
  const seller = sellerAuth.seller!;

  // 5. Register a product as seller
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        shopping_mall_seller_id: seller.id,
        shopping_mall_channel_id: channel.id,
        shopping_mall_section_id: section.id,
        shopping_mall_category_id: category.id,
        code: RandomGenerator.alphabets(10),
        name: RandomGenerator.paragraph({ sentences: 2 }),
        status: "Active",
        business_status: "Approval",
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);

  // 6. Update the product content as owner seller
  const updateBody = {
    content_markdown: RandomGenerator.content({ paragraphs: 2 }),
    return_policy: RandomGenerator.content({ paragraphs: 1 }),
    warranty_policy: RandomGenerator.content({ paragraphs: 1 }),
    locale: "en-US",
  } satisfies IShoppingMallProductContent.IUpdate;
  const updatedContent =
    await api.functional.shoppingMall.seller.products.content.update(
      connection,
      {
        productId: product.id,
        body: updateBody,
      },
    );
  typia.assert(updatedContent);
  TestValidator.equals(
    "Updated product content matches input",
    updatedContent.content_markdown,
    updateBody.content_markdown,
  );
  TestValidator.equals(
    "Updated product locale matches input",
    updatedContent.locale,
    updateBody.locale,
  );

  // 7. Negative: Attempt update with non-owner seller
  // Register a second seller for the same channel/section
  const attackerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    shopping_mall_channel_id: channel.id,
    shopping_mall_section_id: section.id,
    profile_name: RandomGenerator.paragraph({ sentences: 2 }),
    kyc_status: "pending",
  } satisfies IShoppingMallSeller.IJoin;
  const attackerAuth = await api.functional.auth.seller.join(connection, {
    body: attackerJoinBody,
  });
  typia.assert(attackerAuth);

  // Switch connection to the attacker seller (token is handled by SDK)
  await TestValidator.error(
    "Non-owner seller cannot update product content",
    async () => {
      await api.functional.shoppingMall.seller.products.content.update(
        connection,
        {
          productId: product.id,
          body: {
            content_markdown: RandomGenerator.content({ paragraphs: 2 }),
            return_policy: RandomGenerator.content({ paragraphs: 1 }),
            warranty_policy: RandomGenerator.content({ paragraphs: 1 }),
            locale: "fr-FR",
          } satisfies IShoppingMallProductContent.IUpdate,
        },
      );
    },
  );

  // 8. Negative: Soft-delete/discontinue the product (simulate by updating status if possible, else skip)
  // This API does not provide product update/delete for status, so cannot implement this edge case directly.
}
