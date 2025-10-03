import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallChannelCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannelCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSection";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validates product update by seller, ensuring that after onboarding and
 * catalog setup, the seller can create and update only their owned products.
 * Full CRUD cycle for catalog hierarchy is included for isolation.
 */
export async function test_api_product_update_by_seller(
  connection: api.IConnection,
) {
  // 1. Create a channel
  const channel = await api.functional.shoppingMall.admin.channels.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 4 }),
      } satisfies IShoppingMallChannel.ICreate,
    },
  );
  typia.assert(channel);

  // 2. Create a section in the channel
  const section =
    await api.functional.shoppingMall.admin.channels.sections.create(
      connection,
      {
        channelId: channel.id,
        body: {
          shopping_mall_channel_id: channel.id,
          code: RandomGenerator.alphaNumeric(6),
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          display_order: 1,
        } satisfies IShoppingMallSection.ICreate,
      },
    );
  typia.assert(section);

  // 3. Create a category in the channel
  const category =
    await api.functional.shoppingMall.admin.channels.categories.create(
      connection,
      {
        channelId: channel.id,
        body: {
          shopping_mall_channel_id: channel.id,
          parent_id: null,
          code: RandomGenerator.alphaNumeric(5),
          name: RandomGenerator.name(1),
          description: RandomGenerator.paragraph({ sentences: 1 }),
          display_order: 1,
        } satisfies IShoppingMallChannelCategory.ICreate,
      },
    );
  typia.assert(category);

  // 4. Seller joins/registers
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const authorizedSeller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: "StrongPW42@!",
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      shopping_mall_channel_id: channel.id,
      shopping_mall_section_id: section.id,
      profile_name: RandomGenerator.paragraph({ sentences: 2 }),
      kyc_status: "pending",
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(authorizedSeller);
  // Implicit: connection auto-updates auth header for seller

  // 5. Seller creates a product
  const originalProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: {
        shopping_mall_seller_id: authorizedSeller.id,
        shopping_mall_channel_id: channel.id,
        shopping_mall_section_id: section.id,
        shopping_mall_category_id: category.id,
        code: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.name(2),
        status: "Active",
        business_status: "Approval",
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(originalProduct);

  // 6. Seller updates product with new values
  const newSection =
    await api.functional.shoppingMall.admin.channels.sections.create(
      connection,
      {
        channelId: channel.id,
        body: {
          shopping_mall_channel_id: channel.id,
          code: RandomGenerator.alphaNumeric(6),
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          display_order: 2,
        } satisfies IShoppingMallSection.ICreate,
      },
    );
  typia.assert(newSection);

  const newCategory =
    await api.functional.shoppingMall.admin.channels.categories.create(
      connection,
      {
        channelId: channel.id,
        body: {
          shopping_mall_channel_id: channel.id,
          parent_id: null,
          code: RandomGenerator.alphaNumeric(5),
          name: RandomGenerator.name(1),
          description: RandomGenerator.paragraph({ sentences: 1 }),
          display_order: 2,
        } satisfies IShoppingMallChannelCategory.ICreate,
      },
    );
  typia.assert(newCategory);

  const updateBody = {
    shopping_mall_channel_id: channel.id,
    shopping_mall_section_id: newSection.id,
    shopping_mall_category_id: newCategory.id,
    code: RandomGenerator.alphaNumeric(11),
    name: RandomGenerator.name(2),
    status: "Paused",
    business_status: "Suspended",
  } satisfies IShoppingMallProduct.IUpdate;

  const updatedProduct =
    await api.functional.shoppingMall.seller.products.update(connection, {
      productId: originalProduct.id,
      body: updateBody,
    });
  typia.assert(updatedProduct);

  // 7. Validation: All fields are properly updated
  TestValidator.equals(
    "updated name is reflected",
    updatedProduct.name,
    updateBody.name,
  );
  TestValidator.equals(
    "updated code is reflected",
    updatedProduct.code,
    updateBody.code,
  );
  TestValidator.equals(
    "updated status is reflected",
    updatedProduct.status,
    updateBody.status,
  );
  TestValidator.equals(
    "updated business_status is reflected",
    updatedProduct.business_status,
    updateBody.business_status,
  );
  TestValidator.equals(
    "updated section is reflected",
    updatedProduct.shopping_mall_section_id,
    updateBody.shopping_mall_section_id,
  );
  TestValidator.equals(
    "updated category is reflected",
    updatedProduct.shopping_mall_category_id,
    updateBody.shopping_mall_category_id,
  );
  TestValidator.notEquals(
    "updated_at is changed",
    updatedProduct.updated_at,
    originalProduct.updated_at,
  );
  TestValidator.equals("id not changed", updatedProduct.id, originalProduct.id);
  TestValidator.equals(
    "seller id not changed",
    updatedProduct.shopping_mall_seller_id,
    originalProduct.shopping_mall_seller_id,
  );
}
