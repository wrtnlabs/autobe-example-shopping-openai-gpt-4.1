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
 * Seller product option detail retrieval and access control validation
 *
 * Scenario walkthrough:
 *
 * 1. Admin registers a channel.
 * 2. Admin creates a section for the channel.
 * 3. Admin creates a category under the channel.
 * 4. Seller A registers and authenticates, referencing the channel/section.
 * 5. Seller A registers a product referencing the section/category.
 * 6. Seller A creates a product option for their product.
 * 7. Seller A successfully retrieves the detailed information for their product
 *    option, validating all fields.
 * 8. Seller B registers independently and authenticates.
 * 9. Seller B attempts to retrieve Seller A's product option and fails with proper
 *    access control.
 */
export async function test_api_seller_product_option_detail_retrieval(
  connection: api.IConnection,
) {
  // 1. Admin creates a channel
  const channel = await api.functional.shoppingMall.admin.channels.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(6),
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph(),
      } satisfies IShoppingMallChannel.ICreate,
    },
  );
  typia.assert(channel);

  // 2. Admin creates a section
  const section =
    await api.functional.shoppingMall.admin.channels.sections.create(
      connection,
      {
        channelId: channel.id,
        body: {
          shopping_mall_channel_id: channel.id,
          code: RandomGenerator.alphaNumeric(4),
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph(),
          display_order: 1,
        } satisfies IShoppingMallSection.ICreate,
      },
    );
  typia.assert(section);

  // 3. Admin creates a category
  const category =
    await api.functional.shoppingMall.admin.channels.categories.create(
      connection,
      {
        channelId: channel.id,
        body: {
          shopping_mall_channel_id: channel.id,
          code: RandomGenerator.alphaNumeric(5),
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph(),
          display_order: 1,
        } satisfies IShoppingMallChannelCategory.ICreate,
      },
    );
  typia.assert(category);

  // 4. Seller A registers and authenticates
  const sellerAEmail = typia.random<string & tags.Format<"email">>();
  const sellerA = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerAEmail,
      password: "passwordA",
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      shopping_mall_channel_id: channel.id,
      shopping_mall_section_id: section.id,
      profile_name: RandomGenerator.name(),
      kyc_status: "pending",
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerA);

  // 5. Seller A registers a product
  const productA = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        shopping_mall_seller_id: sellerA.id,
        shopping_mall_channel_id: channel.id,
        shopping_mall_section_id: section.id,
        shopping_mall_category_id: category.id,
        code: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(),
        status: "active",
        business_status: "approved",
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(productA);

  // 6. Seller A creates a product option
  const optionCreate = {
    name: "Color",
    required: true,
    position: 1,
  } satisfies IShoppingMallProductOption.ICreate;
  const optionA =
    await api.functional.shoppingMall.seller.products.options.create(
      connection,
      {
        productId: productA.id,
        body: optionCreate,
      },
    );
  typia.assert(optionA);

  // 7. Seller A retrieves detailed info for their product option
  const optionDetail =
    await api.functional.shoppingMall.seller.products.options.at(connection, {
      productId: productA.id,
      optionId: optionA.id,
    });
  typia.assert(optionDetail);
  TestValidator.equals(
    "product option name matches",
    optionDetail.name,
    optionCreate.name,
  );
  TestValidator.equals(
    "product option required field matches",
    optionDetail.required,
    optionCreate.required,
  );
  TestValidator.equals(
    "product option position matches",
    optionDetail.position,
    optionCreate.position,
  );
  TestValidator.equals(
    "product option belongs to correct product",
    optionDetail.shopping_mall_product_id,
    productA.id,
  );

  // 8. Seller B registers independently
  const sellerBEmail = typia.random<string & tags.Format<"email">>();
  const sellerB = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerBEmail,
      password: "passwordB",
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      shopping_mall_channel_id: channel.id,
      shopping_mall_section_id: section.id,
      profile_name: RandomGenerator.name(),
      kyc_status: "pending",
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerB);

  // 9. Seller B tries to access Seller A's product option and fails
  await TestValidator.error(
    "unauthorized access for product option detail fails",
    async () => {
      await api.functional.shoppingMall.seller.products.options.at(connection, {
        productId: productA.id,
        optionId: optionA.id,
      });
    },
  );
}
