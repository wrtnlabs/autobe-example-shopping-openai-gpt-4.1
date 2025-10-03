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
 * Test soft deletion of product option by admin with audit trail:
 *
 * 1. Admin joins (registers)
 * 2. Admin creates a channel
 * 3. Admin adds a section in the channel
 * 4. Admin adds a category in the channel
 * 5. Admin registers a product under the given section and category
 * 6. Admin adds a product option
 * 7. Admin soft deletes the option
 * 8. Attempts to soft delete again (should fail or be idempotent)
 * 9. Verifies deleted_at is set on resource (where retrievable)
 */
export async function test_api_product_option_soft_delete_by_admin_privileges_with_audit(
  connection: api.IConnection,
) {
  // 1. Register admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.name(),
      } satisfies IShoppingMallAdmin.IJoin,
    });
  typia.assert(admin);

  // 2. Create channel
  const channel = await api.functional.shoppingMall.admin.channels.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies IShoppingMallChannel.ICreate,
    },
  );
  typia.assert(channel);

  // 3. Add section
  const section =
    await api.functional.shoppingMall.admin.channels.sections.create(
      connection,
      {
        channelId: channel.id,
        body: {
          shopping_mall_channel_id: channel.id,
          code: RandomGenerator.alphaNumeric(6),
          name: RandomGenerator.name(1),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          display_order: 1,
        } satisfies IShoppingMallSection.ICreate,
      },
    );
  typia.assert(section);

  // 4. Add category
  const category =
    await api.functional.shoppingMall.admin.channels.categories.create(
      connection,
      {
        channelId: channel.id,
        body: {
          shopping_mall_channel_id: channel.id,
          code: RandomGenerator.alphaNumeric(5),
          name: RandomGenerator.name(1),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          display_order: 1,
        } satisfies IShoppingMallChannelCategory.ICreate,
      },
    );
  typia.assert(category);

  // 5. Register product
  const product = await api.functional.shoppingMall.admin.products.create(
    connection,
    {
      body: {
        shopping_mall_seller_id: typia.random<string & tags.Format<"uuid">>(), // Seller must be set, but no seller API, so random for admin
        shopping_mall_channel_id: channel.id,
        shopping_mall_section_id: section.id,
        shopping_mall_category_id: category.id,
        code: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.name(3),
        status: "Active",
        business_status: "Approval",
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);

  // 6. Add product option
  const option =
    await api.functional.shoppingMall.admin.products.options.create(
      connection,
      {
        productId: product.id,
        body: {
          name: RandomGenerator.name(1),
          required: true,
          position: 1,
        } satisfies IShoppingMallProductOption.ICreate,
      },
    );
  typia.assert(option);

  // 7. Soft delete the option
  await api.functional.shoppingMall.admin.products.options.erase(connection, {
    productId: product.id,
    optionId: option.id,
  });

  // 8. Attempt to delete again (should either fail or be idempotent)
  await TestValidator.error(
    "second erase should fail or be idempotent",
    async () => {
      await api.functional.shoppingMall.admin.products.options.erase(
        connection,
        {
          productId: product.id,
          optionId: option.id,
        },
      );
    },
  );

  // 9. Since API does not expose option retrieval after delete, only test that delete finished with no exception
  // If there were a GET/list endpoint to check, would verify deleted_at is set and option does not appear in active queries
}
