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
 * Validate that an admin can update all editable fields of a product, enforce
 * unique constraints, and handle soft-deleted product rejection.
 *
 * Business context: Editing a product is a privileged operation and must be
 * performed by an authenticated admin. Product update requires target
 * existence, uniqueness of name/code (apart from itself), and association to
 * valid section/category/channel. Modifications to a soft-deleted product must
 * be blocked according to audit/compliance rules.
 *
 * 1. Register an admin and acquire authentication
 * 2. Create a channel, section, and category (for associations)
 * 3. Register a product and a distinct second product for duplicate tests
 * 4. Update the first product with all editable fields (name, code, status,
 *    business_status, section, category, channel)
 * 5. Assert that the update response reflects all changes
 * 6. Update again with same name/code as the second product and assert error for
 *    duplicate enforcement
 * 7. Soft-delete the first product by setting status/business_status to a deleted
 *    state, then attempt update and assert modification is rejected
 */
export async function test_api_product_update_by_admin_successful_update(
  connection: api.IConnection,
) {
  // Step 1: Register admin and acquire authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "1234secure!";
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      name: RandomGenerator.name(2),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(admin);

  // Step 2: Create channel, section, category
  const channel = await api.functional.shoppingMall.admin.channels.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(3),
        description: RandomGenerator.paragraph(),
      } satisfies IShoppingMallChannel.ICreate,
    },
  );
  typia.assert(channel);

  const section =
    await api.functional.shoppingMall.admin.channels.sections.create(
      connection,
      {
        channelId: channel.id,
        body: {
          shopping_mall_channel_id: channel.id,
          code: RandomGenerator.alphaNumeric(7),
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph(),
          display_order: typia.random<number & tags.Type<"int32">>(),
        } satisfies IShoppingMallSection.ICreate,
      },
    );
  typia.assert(section);

  const category =
    await api.functional.shoppingMall.admin.channels.categories.create(
      connection,
      {
        channelId: channel.id,
        body: {
          shopping_mall_channel_id: channel.id,
          code: RandomGenerator.alphaNumeric(6),
          name: RandomGenerator.name(2),
          display_order: typia.random<number & tags.Type<"int32">>(),
          description: RandomGenerator.paragraph(),
        } satisfies IShoppingMallChannelCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Register two products for duplicate tests
  const sellerId = typia.random<string & tags.Format<"uuid">>();
  const baseStatus = "Active";
  const baseBizStatus = "Approval";

  // Product 1
  const product1Body = {
    shopping_mall_seller_id: sellerId,
    shopping_mall_channel_id: channel.id,
    shopping_mall_section_id: section.id,
    shopping_mall_category_id: category.id,
    code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(3),
    status: baseStatus,
    business_status: baseBizStatus,
  } satisfies IShoppingMallProduct.ICreate;
  const product1 = await api.functional.shoppingMall.admin.products.create(
    connection,
    {
      body: product1Body,
    },
  );
  typia.assert(product1);

  // Product 2 (to test duplicate constraints)
  const product2Body = {
    shopping_mall_seller_id: sellerId,
    shopping_mall_channel_id: channel.id,
    shopping_mall_section_id: section.id,
    shopping_mall_category_id: category.id,
    code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(3),
    status: baseStatus,
    business_status: baseBizStatus,
  } satisfies IShoppingMallProduct.ICreate;
  const product2 = await api.functional.shoppingMall.admin.products.create(
    connection,
    {
      body: product2Body,
    },
  );
  typia.assert(product2);

  // Step 4: Update product1 fields to new values (use separate valid values)
  const updatedCode = RandomGenerator.alphaNumeric(10);
  const updatedName = RandomGenerator.name(3);
  const updatedStatus = "Paused";
  const updatedBizStatus = "Suspended";
  const updatedSection = section.id;
  const updatedCategory = category.id;
  const updatedChannel = channel.id;
  const updateBody = {
    shopping_mall_channel_id: updatedChannel,
    shopping_mall_section_id: updatedSection,
    shopping_mall_category_id: updatedCategory,
    code: updatedCode,
    name: updatedName,
    status: updatedStatus,
    business_status: updatedBizStatus,
  } satisfies IShoppingMallProduct.IUpdate;
  const updated = await api.functional.shoppingMall.admin.products.update(
    connection,
    {
      productId: product1.id,
      body: updateBody,
    },
  );
  typia.assert(updated);
  TestValidator.equals("updated name", updated.name, updatedName);
  TestValidator.equals("updated code", updated.code, updatedCode);
  TestValidator.equals("updated status", updated.status, updatedStatus);
  TestValidator.equals(
    "updated business_status",
    updated.business_status,
    updatedBizStatus,
  );
  TestValidator.equals(
    "updated channel",
    updated.shopping_mall_channel_id,
    updatedChannel,
  );
  TestValidator.equals(
    "updated section",
    updated.shopping_mall_section_id,
    updatedSection,
  );
  TestValidator.equals(
    "updated category",
    updated.shopping_mall_category_id,
    updatedCategory,
  );

  // Step 5: Update product1 code/name to match product2 for duplicate enforcement
  await TestValidator.error(
    "updating to duplicate code or name yields error",
    async () => {
      await api.functional.shoppingMall.admin.products.update(connection, {
        productId: product1.id,
        body: {
          code: product2.code,
          name: product2.name,
        } satisfies IShoppingMallProduct.IUpdate,
      });
    },
  );

  // Step 6: Soft-delete product1 by setting status to Deleted and verify further update is blocked
  await api.functional.shoppingMall.admin.products.update(connection, {
    productId: product1.id,
    body: { status: "Deleted" } satisfies IShoppingMallProduct.IUpdate,
  });

  await TestValidator.error(
    "update for soft-deleted product is blocked",
    async () => {
      await api.functional.shoppingMall.admin.products.update(connection, {
        productId: product1.id,
        body: {
          name: RandomGenerator.name(2),
        } satisfies IShoppingMallProduct.IUpdate,
      });
    },
  );
}
