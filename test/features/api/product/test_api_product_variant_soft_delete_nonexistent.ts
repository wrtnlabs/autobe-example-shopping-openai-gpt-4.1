import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallChannelCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannelCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSection";

/**
 * Test: Soft-delete attempt by admin on non-existent product variant (SKU).
 *
 * 1. Register and login admin.
 * 2. Create a channel.
 * 3. Create a section within the channel.
 * 4. Create a category in the channel.
 * 5. Create a product referencing the channel, section, category.
 * 6. Attempt to delete a variant for the product using a random (non-existent)
 *    variantId (UUID).
 * 7. Verify that the API blocks the deletion and returns a business logic error,
 *    with no side effects.
 */
export async function test_api_product_variant_soft_delete_nonexistent(
  connection: api.IConnection,
) {
  // Step 1: Register and login admin
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
  } satisfies IShoppingMallAdmin.IJoin;
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinBody });
  typia.assert(admin);

  // Step 2: Create channel
  const channelBody = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IShoppingMallChannel.ICreate;
  const channel: IShoppingMallChannel =
    await api.functional.shoppingMall.admin.channels.create(connection, {
      body: channelBody,
    });
  typia.assert(channel);

  // Step 3: Create section
  const sectionBody = {
    shopping_mall_channel_id: channel.id,
    code: RandomGenerator.alphaNumeric(6),
    name: RandomGenerator.name(),
    display_order: 1,
    description: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IShoppingMallSection.ICreate;
  const section: IShoppingMallSection =
    await api.functional.shoppingMall.admin.channels.sections.create(
      connection,
      {
        channelId: channel.id,
        body: sectionBody,
      },
    );
  typia.assert(section);

  // Step 4: Create category
  const categoryBody = {
    shopping_mall_channel_id: channel.id,
    code: RandomGenerator.alphaNumeric(7),
    name: RandomGenerator.name(),
    display_order: 1,
    description: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IShoppingMallChannelCategory.ICreate;
  const category: IShoppingMallChannelCategory =
    await api.functional.shoppingMall.admin.channels.categories.create(
      connection,
      {
        channelId: channel.id,
        body: categoryBody,
      },
    );
  typia.assert(category);

  // Step 5: Create product
  const productBody = {
    shopping_mall_seller_id: typia.random<string & tags.Format<"uuid">>(), // Assuming system creates a placeholder seller or dummy UUID for admin scenario
    shopping_mall_channel_id: channel.id,
    shopping_mall_section_id: section.id,
    shopping_mall_category_id: category.id,
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(),
    status: "Draft",
    business_status: "Approval",
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.admin.products.create(connection, {
      body: productBody,
    });
  typia.assert(product);

  // Step 6: Attempt to soft-delete a non-existent variant
  const invalidVariantId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "admin cannot soft-delete a non-existent product variant",
    async () => {
      await api.functional.shoppingMall.admin.products.variants.erase(
        connection,
        {
          productId: product.id,
          variantId: invalidVariantId,
        },
      );
    },
  );
}
