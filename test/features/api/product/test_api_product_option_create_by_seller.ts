import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallChannelCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannelCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOption";
import type { IShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSection";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validate seller creation of product option and permission enforcement.
 *
 * 1. Admin creates channel.
 * 2. Admin creates section in the channel.
 * 3. Admin creates a category in the channel.
 * 4. Seller registers, selecting the above channel/section.
 * 5. Seller registers a product assigned to the channel/section/category.
 * 6. Seller creates a product option for their own product -- success expected.
 * 7. A different seller attempts to add an option to the same product --
 *    permission denied expected.
 * 8. Unauthenticated try to add option -- permission denied expected.
 */
export async function test_api_product_option_create_by_seller(
  CONN: api.IConnection,
) {
  // 1. Create admin channel
  const channel = await api.functional.shoppingMall.admin.channels.create(
    CONN,
    {
      body: {
        code: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph(),
      } satisfies IShoppingMallChannel.ICreate,
    },
  );
  typia.assert(channel);

  // 2. Create admin section
  const section =
    await api.functional.shoppingMall.admin.channels.sections.create(CONN, {
      channelId: channel.id,
      body: {
        shopping_mall_channel_id: channel.id,
        code: RandomGenerator.alphaNumeric(6),
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph(),
        display_order: typia.random<number & tags.Type<"int32">>(),
      } satisfies IShoppingMallSection.ICreate,
    });
  typia.assert(section);

  // 3. Create category in channel
  const category =
    await api.functional.shoppingMall.admin.channels.categories.create(CONN, {
      channelId: channel.id,
      body: {
        shopping_mall_channel_id: channel.id,
        code: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph(),
        display_order: typia.random<number & tags.Type<"int32">>(),
      } satisfies IShoppingMallChannelCategory.ICreate,
    });
  typia.assert(category);

  // 4. Seller registers
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(CONN, {
    body: {
      email: sellerEmail,
      password: "password123",
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      shopping_mall_channel_id: channel.id,
      shopping_mall_section_id: section.id,
      profile_name: RandomGenerator.paragraph({ sentences: 2 }),
      kyc_status: "pending",
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);
  // The seller is now authenticated (token auto-managed by SDK)

  // 5. Seller creates a product
  const product = await api.functional.shoppingMall.seller.products.create(
    CONN,
    {
      body: {
        shopping_mall_seller_id: seller.id,
        shopping_mall_channel_id: channel.id,
        shopping_mall_section_id: section.id,
        shopping_mall_category_id: category.id,
        code: RandomGenerator.alphaNumeric(12),
        name: RandomGenerator.paragraph({ sentences: 2 }),
        status: "active",
        business_status: "approval",
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);

  // 6. Seller creates a product option: should succeed
  const optionInput = {
    name: RandomGenerator.pick([
      "Color",
      "Size",
      "Material",
      "Design",
    ] as const),
    required: RandomGenerator.pick([true, false] as const),
    position: typia.random<number & tags.Type<"int32">>(),
  } satisfies IShoppingMallProductOption.ICreate;
  const option =
    await api.functional.shoppingMall.seller.products.options.create(CONN, {
      productId: product.id,
      body: optionInput,
    });
  typia.assert(option);
  TestValidator.equals(
    "option parent link",
    option.shopping_mall_product_id,
    product.id,
  );
  TestValidator.equals("option name", option.name, optionInput.name);
  TestValidator.equals("required flag", option.required, optionInput.required);
  TestValidator.equals("position", option.position, optionInput.position);

  // 7. Another seller registers
  const otherSellerEmail = typia.random<string & tags.Format<"email">>();
  const otherSeller = await api.functional.auth.seller.join(CONN, {
    body: {
      email: otherSellerEmail,
      password: "password456",
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      shopping_mall_channel_id: channel.id,
      shopping_mall_section_id: section.id,
      profile_name: RandomGenerator.paragraph({ sentences: 2 }),
      kyc_status: "pending",
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(otherSeller);

  // Switch to the other seller's auth token
  await api.functional.auth.seller.join(CONN, {
    body: {
      email: otherSellerEmail,
      password: "password456",
      name: otherSeller.seller?.profile_name ?? otherSeller.profile_name,
      phone: RandomGenerator.mobile(),
      shopping_mall_channel_id: channel.id,
      shopping_mall_section_id: section.id,
      profile_name: RandomGenerator.paragraph({ sentences: 2 }),
      kyc_status: "pending",
    } satisfies IShoppingMallSeller.IJoin,
  });
  // Attempt to add option to the first seller's product -- expected to fail
  await TestValidator.error("non-owner seller cannot add option", async () => {
    await api.functional.shoppingMall.seller.products.options.create(CONN, {
      productId: product.id,
      body: {
        name: "HackerOption",
        required: true,
        position: typia.random<number & tags.Type<"int32">>(),
      } satisfies IShoppingMallProductOption.ICreate,
    });
  });

  // 8. Unauthenticated: try to create option (connection reset with blank headers)
  const unauthConn: api.IConnection = { ...CONN, headers: {} };
  await TestValidator.error("unauthenticated cannot add option", async () => {
    await api.functional.shoppingMall.seller.products.options.create(
      unauthConn,
      {
        productId: product.id,
        body: {
          name: "NoAuthOption",
          required: false,
          position: typia.random<number & tags.Type<"int32">>(),
        } satisfies IShoppingMallProductOption.ICreate,
      },
    );
  });
}
