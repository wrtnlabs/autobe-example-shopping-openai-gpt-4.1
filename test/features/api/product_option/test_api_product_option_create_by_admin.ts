import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallChannelCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannelCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOption";
import type { IShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSection";

/**
 * Validate admin product option creation and enforcement of uniqueness/business
 * rules.
 *
 * 1. Register admin
 * 2. Create a channel
 * 3. Create a section in that channel
 * 4. Create a root category in the channel
 * 5. Register a new product under that channel/section/category
 * 6. Create a product option (unique name)
 * 7. Confirm option is attached and attributes match
 * 8. Attempt to create a duplicate named option; expect error.
 */
export async function test_api_product_option_create_by_admin(
  connection: api.IConnection,
) {
  // 1. Register admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(10);
  const adminName = RandomGenerator.name();
  const adminAuth: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        name: adminName,
      } satisfies IShoppingMallAdmin.IJoin,
    });
  typia.assert(adminAuth);
  TestValidator.equals("admin email set", adminAuth.email, adminEmail);
  TestValidator.equals("admin name set", adminAuth.name, adminName);

  // 2. Create channel
  const channelBody = {
    code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph(),
  } satisfies IShoppingMallChannel.ICreate;
  const channel: IShoppingMallChannel =
    await api.functional.shoppingMall.admin.channels.create(connection, {
      body: channelBody,
    });
  typia.assert(channel);
  TestValidator.equals("channel code", channel.code, channelBody.code);

  // 3. Create section
  const sectionBody = {
    shopping_mall_channel_id: channel.id,
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph(),
    display_order: 1,
  } satisfies IShoppingMallSection.ICreate;
  const section: IShoppingMallSection =
    await api.functional.shoppingMall.admin.channels.sections.create(
      connection,
      { channelId: channel.id, body: sectionBody },
    );
  typia.assert(section);
  TestValidator.equals("section code", section.code, sectionBody.code);

  // 4. Create category (root, no parent)
  const categoryBody = {
    shopping_mall_channel_id: channel.id,
    parent_id: null,
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph(),
    display_order: 1,
  } satisfies IShoppingMallChannelCategory.ICreate;
  const category: IShoppingMallChannelCategory =
    await api.functional.shoppingMall.admin.channels.categories.create(
      connection,
      { channelId: channel.id, body: categoryBody },
    );
  typia.assert(category);
  TestValidator.equals("category name", category.name, categoryBody.name);

  // 5. Register product
  const productBody = {
    shopping_mall_seller_id: adminAuth.id,
    shopping_mall_channel_id: channel.id,
    shopping_mall_section_id: section.id,
    shopping_mall_category_id: category.id,
    code: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    status: "Active",
    business_status: "Available",
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.admin.products.create(connection, {
      body: productBody,
    });
  typia.assert(product);
  TestValidator.equals("product code", product.code, productBody.code);
  TestValidator.equals("product name", product.name, productBody.name);

  // 6. Create a product option
  const optionName =
    RandomGenerator.pick(["Color", "Size", "Material"]) +
    "-" +
    RandomGenerator.alphaNumeric(5);
  const optionBody = {
    name: optionName,
    required: true,
    position: 1,
  } satisfies IShoppingMallProductOption.ICreate;
  const option: IShoppingMallProductOption =
    await api.functional.shoppingMall.admin.products.options.create(
      connection,
      { productId: product.id, body: optionBody },
    );
  typia.assert(option);
  TestValidator.equals("option name matches", option.name, optionBody.name);
  TestValidator.equals(
    "option required matches",
    option.required,
    optionBody.required,
  );
  TestValidator.equals(
    "option position matches",
    option.position,
    optionBody.position,
  );

  // 7. Duplicate name -- should reject
  await TestValidator.error(
    "duplicate product option name should fail",
    async () => {
      await api.functional.shoppingMall.admin.products.options.create(
        connection,
        { productId: product.id, body: optionBody },
      );
    },
  );
}
