import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallChannelCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannelCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSection";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test the seller's ability to update a product variant (SKU) for their own
 * product.
 *
 * 1. Register a new channel (as admin).
 * 2. Register a new section in the channel (as admin).
 * 3. Register a new category in the channel (as admin).
 * 4. Seller registration/join and authenticate with the created channel and
 *    section.
 * 5. Seller registers a new product (product will be parent of SKU/variant).
 * 6. Seller registers an initial product variant (SKU) for the product.
 * 7. Seller performs an update to the variant: change price and stock_quantity.
 * 8. Validate the SKU update: verify updated fields, audit/snapshot timestamps,
 *    and ownership enforcement.
 * 9. (Permission) Attempt to update the variant as a different (non-owning) seller
 *    should fail (business logic error).
 */
export async function test_api_product_variant_update_by_seller(
  connection: api.IConnection,
) {
  // 1. Admin registers a new channel
  const channel = await api.functional.shoppingMall.admin.channels.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies IShoppingMallChannel.ICreate,
    },
  );
  typia.assert(channel);

  // 2. Admin registers a new section in the channel
  const section =
    await api.functional.shoppingMall.admin.channels.sections.create(
      connection,
      {
        channelId: channel.id,
        body: {
          shopping_mall_channel_id: channel.id,
          code: RandomGenerator.alphaNumeric(6),
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          display_order: typia.random<number & tags.Type<"int32">>(),
        } satisfies IShoppingMallSection.ICreate,
      },
    );
  typia.assert(section);

  // 3. Admin registers a new category in the channel
  const category =
    await api.functional.shoppingMall.admin.channels.categories.create(
      connection,
      {
        channelId: channel.id,
        body: {
          shopping_mall_channel_id: channel.id,
          parent_id: null,
          code: RandomGenerator.alphaNumeric(6),
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          display_order: typia.random<number & tags.Type<"int32">>(),
        } satisfies IShoppingMallChannelCategory.ICreate,
      },
    );
  typia.assert(category);

  // 4. Seller registration and auth (with new channel and section)
  const sellerEmail = RandomGenerator.alphaNumeric(8) + "@mall-seller.com";
  const sellerPassword = "test1234";
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail satisfies string as string,
      password: sellerPassword,
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      shopping_mall_channel_id: channel.id,
      shopping_mall_section_id: section.id,
      profile_name: RandomGenerator.paragraph({ sentences: 1 }),
      kyc_status: "pending",
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);

  // 5. Seller registers a product
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        shopping_mall_seller_id: seller.id,
        shopping_mall_channel_id: channel.id,
        shopping_mall_section_id: section.id,
        shopping_mall_category_id: category.id,
        code: RandomGenerator.alphaNumeric(12),
        name: RandomGenerator.paragraph({ sentences: 2 }),
        status: "Active", // Assuming status is loosely validated by backend
        business_status: "Approval", // Assuming this is allowed - depends on workflow logic
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);

  // 6. Seller registers an initial product variant (SKU)
  const skuCode1 = RandomGenerator.alphaNumeric(10);
  const variant =
    await api.functional.shoppingMall.seller.products.variants.create(
      connection,
      {
        productId: product.id,
        body: {
          shopping_mall_product_id: product.id,
          sku_code: skuCode1,
          bar_code: null,
          option_values_hash: RandomGenerator.alphaNumeric(16),
          price: 10000,
          stock_quantity: 15,
          weight: 3,
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);

  // 7. Seller updates the variant (modify price and stock_quantity)
  const updatedPrice = 20000;
  const updatedStock = 22 as number & tags.Type<"int32">;
  const updatedSkuCode = skuCode1; // unchanged, keeping unique constraint in check
  const updatedOptionHash = variant.option_values_hash; // unchanged, no option change

  const updatedVariant =
    await api.functional.shoppingMall.seller.products.variants.update(
      connection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          sku_code: updatedSkuCode,
          price: updatedPrice,
          stock_quantity: updatedStock,
          option_values_hash: updatedOptionHash,
        } satisfies IShoppingMallProductVariant.IUpdate,
      },
    );
  typia.assert(updatedVariant);
  TestValidator.equals(
    "SKU code should match after update",
    updatedVariant.sku_code,
    updatedSkuCode,
  );
  TestValidator.equals(
    "Price should be updated",
    updatedVariant.price,
    updatedPrice,
  );
  TestValidator.equals(
    "Stock quantity should be updated",
    updatedVariant.stock_quantity,
    updatedStock,
  );

  TestValidator.notEquals(
    "variant updated_at should be newer than created_at",
    updatedVariant.updated_at,
    variant.updated_at,
  );

  // 8. (Optional) Business rule - attempt to update as another seller should fail
  const otherSellerEmail = RandomGenerator.alphaNumeric(10) + "@mall-other.com";
  const otherSeller = await api.functional.auth.seller.join(connection, {
    body: {
      email: otherSellerEmail,
      password: "test5678",
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      shopping_mall_channel_id: channel.id,
      shopping_mall_section_id: section.id,
      profile_name: RandomGenerator.name(1),
      kyc_status: "pending",
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(otherSeller);
  await TestValidator.error(
    "another seller cannot update this variant",
    async () => {
      await api.functional.shoppingMall.seller.products.variants.update(
        connection,
        {
          productId: product.id,
          variantId: variant.id,
          body: {
            price: updatedPrice + 500,
          } satisfies IShoppingMallProductVariant.IUpdate,
        },
      );
    },
  );
}
