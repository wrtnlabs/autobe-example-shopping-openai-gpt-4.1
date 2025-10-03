import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallChannelCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannelCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductTag";
import type { IShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSection";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validate the update of a product tag by a seller.
 *
 * 1. Register a new seller (requires channel and section to exist already, so
 *    create those via admin APIs first)
 * 2. Create a channel (admin)
 * 3. Create a section in the channel (admin)
 * 4. Create a category in the channel (admin)
 * 5. Register a product for the seller (admin)
 * 6. Attach an initial tag to the product (admin)
 * 7. Seller updates the tag using seller API
 * 8. Validate the tag was updated
 * 9. Attempt to update the tag to a duplicate tag (should error)
 * 10. Attempt to update the tag with invalid characters (should error)
 * 11. Attempt to update the tag by a non-owner seller (should error)
 */
export async function test_api_product_tag_update_by_seller(
  connection: api.IConnection,
) {
  // 1. Create channel (admin API)
  const channel = await api.functional.shoppingMall.admin.channels.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 4 }),
      } satisfies IShoppingMallChannel.ICreate,
    },
  );
  typia.assert(channel);

  // 2. Create section
  const section =
    await api.functional.shoppingMall.admin.channels.sections.create(
      connection,
      {
        channelId: channel.id,
        body: {
          shopping_mall_channel_id: channel.id,
          code: RandomGenerator.alphaNumeric(5),
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          display_order: typia.random<number & tags.Type<"int32">>(),
        } satisfies IShoppingMallSection.ICreate,
      },
    );
  typia.assert(section);

  // 3. Create category
  const category =
    await api.functional.shoppingMall.admin.channels.categories.create(
      connection,
      {
        channelId: channel.id,
        body: {
          shopping_mall_channel_id: channel.id,
          code: RandomGenerator.alphaNumeric(8),
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          display_order: typia.random<number & tags.Type<"int32">>(),
        } satisfies IShoppingMallChannelCategory.ICreate,
      },
    );
  typia.assert(category);

  // 4. Register the seller
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: RandomGenerator.alphaNumeric(12),
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      shopping_mall_channel_id: channel.id,
      shopping_mall_section_id: section.id,
      profile_name: RandomGenerator.paragraph({ sentences: 2 }),
      kyc_status: "pending",
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);

  // 5. Create product for seller (admin, because seller cannot self-create product in available APIs)
  const product = await api.functional.shoppingMall.admin.products.create(
    connection,
    {
      body: {
        shopping_mall_seller_id: seller.id,
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

  // 6. Create initial tag for product
  const initialTagValue = RandomGenerator.alphaNumeric(8);
  const tag = await api.functional.shoppingMall.admin.products.tags.create(
    connection,
    {
      productId: product.id,
      body: {
        shopping_mall_product_id: product.id,
        tag: initialTagValue,
      } satisfies IShoppingMallProductTag.ICreate,
    },
  );
  typia.assert(tag);

  // 7. Seller updates the tag
  const newTagValue = RandomGenerator.alphaNumeric(9);
  const updatedTag =
    await api.functional.shoppingMall.seller.products.tags.update(connection, {
      productId: product.id,
      tagId: tag.id,
      body: {
        tag: newTagValue,
      } satisfies IShoppingMallProductTag.IUpdate,
    });
  typia.assert(updatedTag);
  TestValidator.equals("tag should be updated", updatedTag.tag, newTagValue);
  TestValidator.equals(
    "product ID should match",
    updatedTag.shopping_mall_product_id,
    product.id,
  );
  TestValidator.equals(
    "tag ID should not change after update",
    updatedTag.id,
    tag.id,
  );

  // 8. Try updating to duplicate tag (should error)
  await TestValidator.error(
    "updating tag to duplicate value should fail",
    async () => {
      await api.functional.shoppingMall.admin.products.tags.create(connection, {
        productId: product.id,
        body: {
          shopping_mall_product_id: product.id,
          tag: newTagValue,
        } satisfies IShoppingMallProductTag.ICreate,
      });
      // Now try to update the previous tag to duplicate value
      await api.functional.shoppingMall.seller.products.tags.update(
        connection,
        {
          productId: product.id,
          tagId: tag.id,
          body: {
            tag: newTagValue,
          } satisfies IShoppingMallProductTag.IUpdate,
        },
      );
    },
  );

  // 9. Attempt to update with invalid characters (policy unknown but test with likely invalid set)
  await TestValidator.error(
    "updating tag with invalid characters should fail",
    async () => {
      await api.functional.shoppingMall.seller.products.tags.update(
        connection,
        {
          productId: product.id,
          tagId: tag.id,
          body: {
            tag: "@!#$%<>",
          } satisfies IShoppingMallProductTag.IUpdate,
        },
      );
    },
  );

  // 10. Attempt to update as a different seller (simulate by registering a new seller and using its token)
  const otherSellerEmail = typia.random<string & tags.Format<"email">>();
  const otherSeller = await api.functional.auth.seller.join(connection, {
    body: {
      email: otherSellerEmail,
      password: RandomGenerator.alphaNumeric(12),
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      shopping_mall_channel_id: channel.id,
      shopping_mall_section_id: section.id,
      profile_name: RandomGenerator.paragraph({ sentences: 2 }),
      kyc_status: "pending",
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(otherSeller);
  await TestValidator.error(
    "non-owner seller cannot update product tag",
    async () => {
      await api.functional.shoppingMall.seller.products.tags.update(
        connection,
        {
          productId: product.id,
          tagId: tag.id,
          body: {
            tag: RandomGenerator.alphaNumeric(9),
          } satisfies IShoppingMallProductTag.IUpdate,
        },
      );
    },
  );

  // (Optional) Audit/logging check - cannot be performed unless secondary audit endpoint/API available
}
