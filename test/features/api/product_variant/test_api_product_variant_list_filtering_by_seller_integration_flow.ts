import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductVariant";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallChannelCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannelCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOption";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSection";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test product variant list and filtering as seller: (1) Register seller, (2)
 * Register channel/section/category, (3) Register product, (4) Add option(s),
 * (5) Add multiple variants with distinct SKU codes, prices, and stocks, (6)
 * List variants as seller using various filters (by SKU code, stock range,
 * price range), (7) Confirm only seller's products returned and data matches
 * inserted variants. Test security edge: ensure another seller/account cannot
 * access variants from different seller product. Business edge: try filter for
 * non-existent SKU; expect empty result.
 */
export async function test_api_product_variant_list_filtering_by_seller_integration_flow(
  connection: api.IConnection,
) {
  // 1. Register a channel (admin)
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

  // 2. Register a section in the channel
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
          display_order: typia.random<number & tags.Type<"int32">>(),
        } satisfies IShoppingMallSection.ICreate,
      },
    );
  typia.assert(section);

  // 3. Register a category in the channel
  const category =
    await api.functional.shoppingMall.admin.channels.categories.create(
      connection,
      {
        channelId: channel.id,
        body: {
          shopping_mall_channel_id: channel.id,
          parent_id: null,
          code: RandomGenerator.alphaNumeric(6),
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph(),
          display_order: typia.random<number & tags.Type<"int32">>(),
        } satisfies IShoppingMallChannelCategory.ICreate,
      },
    );
  typia.assert(category);

  // 4. Register a seller (will own the products)
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: "password1!",
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      shopping_mall_channel_id: channel.id,
      shopping_mall_section_id: section.id,
      profile_name: RandomGenerator.name(),
      kyc_status: "pending",
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);
  // Connection now holds the seller's credentials

  // 5. Register a product under this seller
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        shopping_mall_seller_id: seller.id,
        shopping_mall_channel_id: channel.id,
        shopping_mall_section_id: section.id,
        shopping_mall_category_id: category.id,
        code: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(),
        status: "Active",
        business_status: "normal",
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);

  // 6. Add a product option
  const option =
    await api.functional.shoppingMall.seller.products.options.create(
      connection,
      {
        productId: product.id,
        body: {
          name: "Color",
          required: true,
          position: 1,
        } satisfies IShoppingMallProductOption.ICreate,
      },
    );
  typia.assert(option);

  // 7. Add several product variants (different colors)
  const colorOptions = ["Red", "Blue", "Green"] as const;
  const variants: IShoppingMallProductVariant[] = [];
  for (let i = 0; i < colorOptions.length; ++i) {
    const sku = `SKU-${RandomGenerator.alphaNumeric(6).toUpperCase()}-${colorOptions[i]}`;
    const variant =
      await api.functional.shoppingMall.seller.products.variants.create(
        connection,
        {
          productId: product.id,
          body: {
            shopping_mall_product_id: product.id,
            sku_code: sku,
            option_values_hash: RandomGenerator.alphaNumeric(32),
            price: 1000 + i * 500,
            stock_quantity: (10 + i * 5) as number & tags.Type<"int32">,
            weight: 1.0 + i,
          } satisfies IShoppingMallProductVariant.ICreate,
        },
      );
    typia.assert(variant);
    variants.push(variant);
  }

  // 8. Filter by SKU code (partial search, pick the middle one)
  const middleSku = variants[1].sku_code;
  const skuSubstr = middleSku.substring(0, 8);
  {
    const res =
      await api.functional.shoppingMall.seller.products.variants.index(
        connection,
        {
          productId: product.id,
          body: {
            sku_code: skuSubstr,
          } satisfies Partial<IShoppingMallProductVariant.IRequest>,
        },
      );
    typia.assert(res);
    TestValidator.predicate(
      "Filter variants by partial SKU returns correct subset",
      res.data.length > 0 &&
        res.data.some((v) => v.sku_code.includes(skuSubstr)),
    );
  }

  // 9. Filter by stock quantity range
  {
    const minStock = 12;
    const maxStock = 100;
    const res =
      await api.functional.shoppingMall.seller.products.variants.index(
        connection,
        {
          productId: product.id,
          body: {
            stockMin: minStock as number & tags.Type<"int32">,
            stockMax: maxStock as number & tags.Type<"int32">,
          } satisfies Partial<IShoppingMallProductVariant.IRequest>,
        },
      );
    typia.assert(res);
    TestValidator.predicate(
      "Stock range filter - all stock quantities in result within bounds",
      res.data.every(
        (v) => v.stock_quantity >= minStock && v.stock_quantity <= maxStock,
      ),
    );
  }

  // 10. Filter by price range
  {
    const priceMin = 1200;
    const priceMax = 1700;
    const res =
      await api.functional.shoppingMall.seller.products.variants.index(
        connection,
        {
          productId: product.id,
          body: {
            priceMin,
            priceMax,
          } satisfies Partial<IShoppingMallProductVariant.IRequest>,
        },
      );
    typia.assert(res);
    TestValidator.predicate(
      "Price range filter - all price fields in result are within range",
      res.data.every((v) => v.price >= priceMin && v.price <= priceMax),
    );
  }

  // 11. Filter with a non-existent SKU code
  {
    const res =
      await api.functional.shoppingMall.seller.products.variants.index(
        connection,
        {
          productId: product.id,
          body: {
            sku_code: "DOESNOTEXIST",
          } satisfies Partial<IShoppingMallProductVariant.IRequest>,
        },
      );
    typia.assert(res);
    TestValidator.equals(
      "Filtering by a non-existent SKU returns no variants",
      res.data.length,
      0,
    );
  }

  // 12. SECURITY: Register a different seller and try to list variants from another seller's product
  // 12-1. Register new channel, section, category, seller, product
  const channel2 = await api.functional.shoppingMall.admin.channels.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph(),
      } satisfies IShoppingMallChannel.ICreate,
    },
  );
  typia.assert(channel2);
  const section2 =
    await api.functional.shoppingMall.admin.channels.sections.create(
      connection,
      {
        channelId: channel2.id,
        body: {
          shopping_mall_channel_id: channel2.id,
          code: RandomGenerator.alphaNumeric(8),
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph(),
          display_order: typia.random<number & tags.Type<"int32">>(),
        } satisfies IShoppingMallSection.ICreate,
      },
    );
  typia.assert(section2);
  const category2 =
    await api.functional.shoppingMall.admin.channels.categories.create(
      connection,
      {
        channelId: channel2.id,
        body: {
          shopping_mall_channel_id: channel2.id,
          parent_id: null,
          code: RandomGenerator.alphaNumeric(6),
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph(),
          display_order: typia.random<number & tags.Type<"int32">>(),
        } satisfies IShoppingMallChannelCategory.ICreate,
      },
    );
  typia.assert(category2);

  const seller2Email = typia.random<string & tags.Format<"email">>();
  const seller2 = await api.functional.auth.seller.join(connection, {
    body: {
      email: seller2Email,
      password: "password2!",
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      shopping_mall_channel_id: channel2.id,
      shopping_mall_section_id: section2.id,
      profile_name: RandomGenerator.name(),
      kyc_status: "pending",
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller2);
  const product2 = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        shopping_mall_seller_id: seller2.id,
        shopping_mall_channel_id: channel2.id,
        shopping_mall_section_id: section2.id,
        shopping_mall_category_id: category2.id,
        code: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(),
        status: "Active",
        business_status: "normal",
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product2);
  const option2 =
    await api.functional.shoppingMall.seller.products.options.create(
      connection,
      {
        productId: product2.id,
        body: {
          name: "Size",
          required: true,
          position: 1,
        } satisfies IShoppingMallProductOption.ICreate,
      },
    );
  typia.assert(option2);
  // One variant for the second seller
  const variant2 =
    await api.functional.shoppingMall.seller.products.variants.create(
      connection,
      {
        productId: product2.id,
        body: {
          shopping_mall_product_id: product2.id,
          sku_code: RandomGenerator.alphaNumeric(10),
          option_values_hash: RandomGenerator.alphaNumeric(32),
          price: 1550,
          stock_quantity: 50 as number & tags.Type<"int32">,
          weight: 2.0,
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant2);

  // 12-2. Switch back to seller1 by re-authenticating
  await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: "password1!",
      name: seller.seller?.profile_name ?? RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      shopping_mall_channel_id: channel.id,
      shopping_mall_section_id: section.id,
      profile_name: seller.seller?.profile_name ?? RandomGenerator.name(),
      kyc_status: "pending",
    } satisfies IShoppingMallSeller.IJoin,
  });
  // 12-3. Try to list seller2's product variants (should be forbidden/empty)
  const accessRes =
    await api.functional.shoppingMall.seller.products.variants.index(
      connection,
      {
        productId: product2.id,
        body: {},
      },
    );
  typia.assert(accessRes);
  TestValidator.equals(
    "Seller cannot access another seller's product variants",
    accessRes.data.length,
    0,
  );
}
