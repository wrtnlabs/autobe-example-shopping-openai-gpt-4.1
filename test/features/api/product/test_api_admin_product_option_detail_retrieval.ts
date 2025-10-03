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
 * Admin retrieves the detail view for a specific product option.
 *
 * Validates that the admin, with global access rights, can retrieve the full
 * detail for any product option. Ensures all setup dependencies are present
 * (admin, channel, section, category, product, option), uses correct random
 * data, and checks that the GET detail includes all required fields: id,
 * shopping_mall_product_id, name, required, position, created_at, updated_at,
 * and (nullable) deleted_at. All foreign key values are checked for proper
 * relationships. Administration-specific audit fields are validated for correct
 * presence, including logic that deleted_at is null for fresh options. The
 * option is not hidden/restricted, so only positive detail-visibility is
 * asserted here.
 *
 * Test steps:
 *
 * 1. Register a new admin
 * 2. Admin creates channel
 * 3. Admin creates a section for the channel
 * 4. Admin creates a category for the channel
 * 5. Admin creates a product mapped to the created channel, section, and category
 * 6. Admin creates a product option under the new product
 * 7. Admin retrieves the option's detail via GET and validates:
 *
 *    - All key fields are present and correct
 *    - Relationships are valid (option belongs to correct product, product to
 *         channel/section/category)
 *    - Audit fields are included (created_at, updated_at, deleted_at)
 *    - Deleted_at is null (option is not deleted)
 */
export async function test_api_admin_product_option_detail_retrieval(
  connection: api.IConnection,
) {
  // 1. Register a new admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "test1234*",
      name: RandomGenerator.name(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(admin);

  // 2. Admin creates channel
  const channel = await api.functional.shoppingMall.admin.channels.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph(),
      } satisfies IShoppingMallChannel.ICreate,
    },
  );
  typia.assert(channel);

  // 3. Admin creates a section for the channel
  const section =
    await api.functional.shoppingMall.admin.channels.sections.create(
      connection,
      {
        channelId: channel.id,
        body: {
          shopping_mall_channel_id: channel.id,
          code: RandomGenerator.alphaNumeric(6),
          name: RandomGenerator.name(1),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          display_order: typia.random<number & tags.Type<"int32">>(),
        } satisfies IShoppingMallSection.ICreate,
      },
    );
  typia.assert(section);

  // 4. Admin creates a category for the channel
  const category =
    await api.functional.shoppingMall.admin.channels.categories.create(
      connection,
      {
        channelId: channel.id,
        body: {
          shopping_mall_channel_id: channel.id,
          code: RandomGenerator.alphaNumeric(6),
          name: RandomGenerator.name(1),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          display_order: typia.random<number & tags.Type<"int32">>(),
        } satisfies IShoppingMallChannelCategory.ICreate,
      },
    );
  typia.assert(category);

  // 5. Admin creates a product mapped to the channel, section, and category
  const product = await api.functional.shoppingMall.admin.products.create(
    connection,
    {
      body: {
        shopping_mall_seller_id: typia.random<string & tags.Format<"uuid">>(), // Mocked (admin)
        shopping_mall_channel_id: channel.id,
        shopping_mall_section_id: section.id,
        shopping_mall_category_id: category.id,
        code: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(2),
        status: "Active",
        business_status: "Approval",
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);

  // 6. Admin creates a product option under the new product
  const option =
    await api.functional.shoppingMall.admin.products.options.create(
      connection,
      {
        productId: product.id,
        body: {
          name: RandomGenerator.name(1),
          required: true,
          position: typia.random<number & tags.Type<"int32">>(),
        } satisfies IShoppingMallProductOption.ICreate,
      },
    );
  typia.assert(option);

  // 7. Admin retrieves the option's detail via GET, validates fields/relations/audit
  const detail = await api.functional.shoppingMall.admin.products.options.at(
    connection,
    {
      productId: product.id,
      optionId: option.id,
    },
  );
  typia.assert(detail);

  // Validate identity and relationship fields
  TestValidator.equals("option.id matches detail", detail.id, option.id);
  TestValidator.equals(
    "option.parent product id matches",
    detail.shopping_mall_product_id,
    product.id,
  );

  // Validate main fields
  TestValidator.equals("option name matches", detail.name, option.name);
  TestValidator.equals(
    "option required flag matches",
    detail.required,
    option.required,
  );
  TestValidator.equals(
    "option position matches",
    detail.position,
    option.position,
  );

  // Validate audit fields
  TestValidator.predicate(
    "created_at present",
    !!detail.created_at && typeof detail.created_at === "string",
  );
  TestValidator.predicate(
    "updated_at present",
    !!detail.updated_at && typeof detail.updated_at === "string",
  );
  TestValidator.equals(
    "deleted_at should be null for new option (not deleted)",
    detail.deleted_at,
    null,
  );
}
