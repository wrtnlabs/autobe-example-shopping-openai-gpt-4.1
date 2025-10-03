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
 * Update a product option as admin, covering channel, section, category,
 * product, and option registration, then exercising the update endpoint.
 */
export async function test_api_product_option_update_by_admin_with_full_workflow(
  connection: api.IConnection,
) {
  // 1. Register admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        name: RandomGenerator.name(),
      },
    });
  typia.assert(admin);

  // 2. Create channel
  const channelBody = {
    code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph(),
  } satisfies IShoppingMallChannel.ICreate;
  const channel = await api.functional.shoppingMall.admin.channels.create(
    connection,
    { body: channelBody },
  );
  typia.assert(channel);
  TestValidator.equals("channel name matches", channel.name, channelBody.name);

  // 3. Create section in channel
  const sectionBody = {
    shopping_mall_channel_id: channel.id,
    code: RandomGenerator.alphaNumeric(6),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    display_order: typia.random<number & tags.Type<"int32">>(),
  } satisfies IShoppingMallSection.ICreate;
  const section =
    await api.functional.shoppingMall.admin.channels.sections.create(
      connection,
      {
        channelId: channel.id,
        body: sectionBody,
      },
    );
  typia.assert(section);
  TestValidator.equals(
    "section linked channel",
    section.shopping_mall_channel_id,
    channel.id,
  );

  // 4. Register category in channel
  const categoryBody = {
    shopping_mall_channel_id: channel.id,
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    display_order: typia.random<number & tags.Type<"int32">>(),
  } satisfies IShoppingMallChannelCategory.ICreate;
  const category =
    await api.functional.shoppingMall.admin.channels.categories.create(
      connection,
      {
        channelId: channel.id,
        body: categoryBody,
      },
    );
  typia.assert(category);
  TestValidator.equals(
    "category channel",
    category.shopping_mall_channel_id,
    channel.id,
  );

  // 5. Register product linked with channel, section, category
  // -- For test, use the admin ID as artificial seller (this will be adjusted in real environment)
  const productBody = {
    shopping_mall_seller_id: admin.id as string & tags.Format<"uuid">, // fake seller
    shopping_mall_channel_id: channel.id,
    shopping_mall_section_id: section.id,
    shopping_mall_category_id: category.id,
    code: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    status: "Active",
    business_status: "Approved",
  } satisfies IShoppingMallProduct.ICreate;
  const product = await api.functional.shoppingMall.admin.products.create(
    connection,
    {
      body: productBody,
    },
  );
  typia.assert(product);
  TestValidator.equals(
    "product channel match",
    product.shopping_mall_channel_id,
    channel.id,
  );

  // 6. Create product option
  const initialOptionName = RandomGenerator.name();
  const optionBody = {
    name: initialOptionName,
    required: true,
    position: typia.random<number & tags.Type<"int32">>(),
  } satisfies IShoppingMallProductOption.ICreate;
  const option =
    await api.functional.shoppingMall.admin.products.options.create(
      connection,
      {
        productId: product.id,
        body: optionBody,
      },
    );
  typia.assert(option);
  TestValidator.equals("option name", option.name, initialOptionName);

  // 7. Update product option: change name, required flag, and position
  const updateBody = {
    name: RandomGenerator.name(),
    required: false,
    position: (option.position + 1) satisfies number as number,
  } satisfies IShoppingMallProductOption.IUpdate;
  const updated =
    await api.functional.shoppingMall.admin.products.options.update(
      connection,
      {
        productId: product.id,
        optionId: option.id,
        body: updateBody,
      },
    );
  typia.assert(updated);
  TestValidator.equals("option updated name", updated.name, updateBody.name);
  TestValidator.equals(
    "option required flag updated",
    updated.required,
    updateBody.required,
  );
  TestValidator.equals(
    "option position updated",
    updated.position,
    updateBody.position,
  );
  TestValidator.predicate(
    "updated_at is changed",
    updated.updated_at !== option.updated_at,
  );

  // 8. Edge case: attempt duplicate name
  const duplicateOptionBody = {
    name: updateBody.name!,
    required: true,
    position: (updateBody.position! + 1) satisfies number as number,
  } satisfies IShoppingMallProductOption.ICreate;
  const duplicateOption =
    await api.functional.shoppingMall.admin.products.options.create(
      connection,
      {
        productId: product.id,
        body: duplicateOptionBody,
      },
    );
  typia.assert(duplicateOption);

  await TestValidator.error(
    "cannot update with duplicate option name",
    async () => {
      await api.functional.shoppingMall.admin.products.options.update(
        connection,
        {
          productId: product.id,
          optionId: duplicateOption.id,
          body: {
            name: updateBody.name,
          } satisfies IShoppingMallProductOption.IUpdate,
        },
      );
    },
  );

  // 9. Confirm only admin can update: simulate unauthenticated connection
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("non-admin cannot update option", async () => {
    await api.functional.shoppingMall.admin.products.options.update(
      unauthConn,
      {
        productId: product.id,
        optionId: updated.id,
        body: {
          name: RandomGenerator.name(),
        } satisfies IShoppingMallProductOption.IUpdate,
      },
    );
  });
}
