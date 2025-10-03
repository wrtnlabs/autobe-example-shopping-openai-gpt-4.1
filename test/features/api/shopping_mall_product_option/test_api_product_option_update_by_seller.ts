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
 * Test that a seller can update their own product option with business rule
 * enforcement.
 *
 * Flow:
 *
 * 1. Admin creates channel, section and category for product setup.
 * 2. Register a seller account using the created channel/section.
 * 3. Seller creates a product referencing the channel/section/category.
 * 4. Seller creates two product options (unique names).
 * 5. Seller updates the first product option (change name, required flag,
 *    position).
 * 6. Validate the option was updated as expected (assert all updated fields +
 *    audit timestamp).
 * 7. Edge: attempt to update first option's name to duplicate the second's name
 *    (should trigger conflict error).
 */
export async function test_api_product_option_update_by_seller(
  connection: api.IConnection,
) {
  // 1. Admin creates channel
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

  // 2. Admin creates section in channel
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
          display_order: 1,
        } satisfies IShoppingMallSection.ICreate,
      },
    );
  typia.assert(section);

  // 3. Admin creates category in channel
  const category =
    await api.functional.shoppingMall.admin.channels.categories.create(
      connection,
      {
        channelId: channel.id,
        body: {
          shopping_mall_channel_id: channel.id,
          code: RandomGenerator.alphaNumeric(8),
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph(),
          display_order: 1,
        } satisfies IShoppingMallChannelCategory.ICreate,
      },
    );
  typia.assert(category);

  // 4. Register seller using created channel/section
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: "Test123!",
      name: RandomGenerator.name(),
      shopping_mall_channel_id: channel.id,
      shopping_mall_section_id: section.id,
      profile_name: RandomGenerator.name(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);

  // 5. Seller creates a product
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
        business_status: "Approved",
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);

  // 6. Create first option
  const option1 =
    await api.functional.shoppingMall.seller.products.options.create(
      connection,
      {
        productId: product.id,
        body: {
          name: "OptionA",
          required: true,
          position: 1,
        } satisfies IShoppingMallProductOption.ICreate,
      },
    );
  typia.assert(option1);

  // 7. Create second option
  const option2 =
    await api.functional.shoppingMall.seller.products.options.create(
      connection,
      {
        productId: product.id,
        body: {
          name: "OptionB",
          required: false,
          position: 2,
        } satisfies IShoppingMallProductOption.ICreate,
      },
    );
  typia.assert(option2);

  // 8. Update option1 (valid changes)
  const updatedName = "OptionA-Edited";
  const updatedRequired = false;
  const updatedPosition = 3;
  const updatedOption =
    await api.functional.shoppingMall.seller.products.options.update(
      connection,
      {
        productId: product.id,
        optionId: option1.id,
        body: {
          name: updatedName,
          required: updatedRequired,
          position: updatedPosition,
        } satisfies IShoppingMallProductOption.IUpdate,
      },
    );
  typia.assert(updatedOption);
  TestValidator.equals("option name updated", updatedOption.name, updatedName);
  TestValidator.equals(
    "option required updated",
    updatedOption.required,
    updatedRequired,
  );
  TestValidator.equals(
    "option position updated",
    updatedOption.position,
    updatedPosition,
  );
  TestValidator.predicate(
    "updated_at timestamp updated",
    new Date(updatedOption.updated_at).getTime() >
      new Date(option1.updated_at).getTime(),
  );

  // 9. Edge: try to update option1's name to duplicate option2's name -- should fail
  await TestValidator.error("duplicate option name should fail", async () => {
    await api.functional.shoppingMall.seller.products.options.update(
      connection,
      {
        productId: product.id,
        optionId: option1.id,
        body: {
          name: option2.name,
        } satisfies IShoppingMallProductOption.IUpdate,
      },
    );
  });
}
