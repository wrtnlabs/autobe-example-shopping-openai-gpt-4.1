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
 * Validate that an administrator can retrieve the details of a product option
 * they created.
 *
 * 1. Admin registration (join)
 * 2. Create channel for products
 * 3. Create section within channel
 * 4. Create category for that channel
 * 5. Register a product referencing admin, channel, section, and category
 * 6. Add an option to the product
 * 7. Retrieve the product option by ID as admin
 * 8. Validate that the returned details match what was created, and confirm
 *    audit/meta fields presence
 */
export async function test_api_product_option_admin_retrieval_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin registration (join)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminName = RandomGenerator.name();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "Secure#Passw0rd",
      name: adminName,
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(admin);

  // 2. Create channel
  const channel = await api.functional.shoppingMall.admin.channels.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IShoppingMallChannel.ICreate,
    },
  );
  typia.assert(channel);

  // 3. Create section in channel
  const section =
    await api.functional.shoppingMall.admin.channels.sections.create(
      connection,
      {
        channelId: channel.id,
        body: {
          shopping_mall_channel_id: channel.id,
          code: RandomGenerator.alphaNumeric(8),
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          display_order: typia.random<number & tags.Type<"int32">>(),
        } satisfies IShoppingMallSection.ICreate,
      },
    );
  typia.assert(section);

  // 4. Create category in channel
  const category =
    await api.functional.shoppingMall.admin.channels.categories.create(
      connection,
      {
        channelId: channel.id,
        body: {
          shopping_mall_channel_id: channel.id,
          code: RandomGenerator.alphaNumeric(6),
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          display_order: typia.random<number & tags.Type<"int32">>(),
        } satisfies IShoppingMallChannelCategory.ICreate,
      },
    );
  typia.assert(category);

  // 5. Register a product with references
  const productCode = RandomGenerator.alphaNumeric(10);
  const productName = RandomGenerator.name();
  const productStatus = "Active";
  const productBusinessStatus = "Approval";
  const product = await api.functional.shoppingMall.admin.products.create(
    connection,
    {
      body: {
        shopping_mall_seller_id: admin.id,
        shopping_mall_channel_id: channel.id,
        shopping_mall_section_id: section.id,
        shopping_mall_category_id: category.id,
        code: productCode,
        name: productName,
        status: productStatus,
        business_status: productBusinessStatus,
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);

  // 6. Add an option to the product
  const optionName = "Color";
  const optionRequired = true;
  const optionPosition = typia.random<number & tags.Type<"int32">>();
  const option =
    await api.functional.shoppingMall.admin.products.options.create(
      connection,
      {
        productId: product.id,
        body: {
          name: optionName,
          required: optionRequired,
          position: optionPosition,
        } satisfies IShoppingMallProductOption.ICreate,
      },
    );
  typia.assert(option);

  // 7. Retrieve the newly created product option by ID
  const retrieved = await api.functional.shoppingMall.admin.products.options.at(
    connection,
    {
      productId: product.id,
      optionId: option.id,
    },
  );
  typia.assert(retrieved);

  // 8. Validate details
  TestValidator.equals("option id matches", retrieved.id, option.id);
  TestValidator.equals("option name matches", retrieved.name, optionName);
  TestValidator.equals(
    "option required matches",
    retrieved.required,
    optionRequired,
  );
  TestValidator.equals(
    "option position matches",
    retrieved.position,
    optionPosition,
  );
  TestValidator.equals(
    "shopping_mall_product_id matches",
    retrieved.shopping_mall_product_id,
    product.id,
  );
  TestValidator.predicate("created_at is present", !!retrieved.created_at);
  TestValidator.predicate("updated_at is present", !!retrieved.updated_at);
  TestValidator.equals(
    "deleted_at should be null or undef",
    retrieved.deleted_at ?? null,
    null,
  );
}
