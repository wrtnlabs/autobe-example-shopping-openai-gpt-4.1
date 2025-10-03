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
 * Test that an authenticated admin can update product data for any product in
 * the catalog, including those not created by themselves.
 *
 * This scenario demonstrates end-to-end admin product management:
 *
 * 1. Register an admin with a unique business email (admin join)
 * 2. Create a new shopping mall channel (admin scope)
 * 3. Create a section within the channel
 * 4. Create a category within the same channel
 * 5. As the admin, register a product using valid values and link it to the
 *    channel, section, and category
 * 6. Perform a PUT update on the product, changing multiple updatable fields
 *    (e.g., name, code, status, section, and category)
 * 7. Assert all updated fields are properly reflected and the product id remains
 *    constant
 * 8. Validate updated_at changes, deleted_at remains as expected, and type
 *    assertion passes
 */
export async function test_api_product_update_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate a new admin
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminJoinBody = {
    email: adminEmail,
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
  } satisfies IShoppingMallAdmin.IJoin;
  const adminAuthorized = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert(adminAuthorized);

  // Step 2: Create a new channel
  const channelRequest = {
    code: RandomGenerator.alphaNumeric(7),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
  } satisfies IShoppingMallChannel.ICreate;
  const channel = await api.functional.shoppingMall.admin.channels.create(
    connection,
    { body: channelRequest },
  );
  typia.assert(channel);

  // Step 3: Create a section within the channel
  const sectionRequest = {
    shopping_mall_channel_id: channel.id,
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    display_order: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<1000>
    >() satisfies number as number,
  } satisfies IShoppingMallSection.ICreate;
  const section =
    await api.functional.shoppingMall.admin.channels.sections.create(
      connection,
      { channelId: channel.id, body: sectionRequest },
    );
  typia.assert(section);

  // Step 4: Create a category within the channel
  const categoryRequest = {
    shopping_mall_channel_id: channel.id,
    parent_id: null,
    code: RandomGenerator.alphaNumeric(6),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    display_order: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<1000>
    >() satisfies number as number,
  } satisfies IShoppingMallChannelCategory.ICreate;
  const category =
    await api.functional.shoppingMall.admin.channels.categories.create(
      connection,
      { channelId: channel.id, body: categoryRequest },
    );
  typia.assert(category);

  // Step 5: Register product as admin
  const productCode = RandomGenerator.alphaNumeric(10);
  const productCreate = {
    shopping_mall_seller_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_channel_id: channel.id,
    shopping_mall_section_id: section.id,
    shopping_mall_category_id: category.id,
    code: productCode,
    name: RandomGenerator.paragraph({ sentences: 3 }),
    status: "Active",
    business_status: "Approval",
  } satisfies IShoppingMallProduct.ICreate;
  const createdProduct =
    await api.functional.shoppingMall.admin.products.create(connection, {
      body: productCreate,
    });
  typia.assert(createdProduct);

  // Step 6: Update product - change name, code, section, status, business_status
  const updateName = RandomGenerator.paragraph({ sentences: 3 });
  const updateCode = RandomGenerator.alphaNumeric(12);
  const newSectionRequest = {
    shopping_mall_channel_id: channel.id,
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    display_order: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<1000>
    >() satisfies number as number,
  } satisfies IShoppingMallSection.ICreate;
  const newSection =
    await api.functional.shoppingMall.admin.channels.sections.create(
      connection,
      { channelId: channel.id, body: newSectionRequest },
    );
  typia.assert(newSection);

  const updatePayload = {
    name: updateName,
    code: updateCode,
    shopping_mall_section_id: newSection.id,
    status: "Paused",
    business_status: "Blocked",
  } satisfies IShoppingMallProduct.IUpdate;

  const updatedProduct =
    await api.functional.shoppingMall.seller.products.update(connection, {
      productId: createdProduct.id,
      body: updatePayload,
    });
  typia.assert(updatedProduct);

  // Step 7: Assert all updated fields are reflected correctly, id is constant
  TestValidator.equals(
    "product id remains constant after update",
    updatedProduct.id,
    createdProduct.id,
  );
  TestValidator.equals("product name updated", updatedProduct.name, updateName);
  TestValidator.equals("product code updated", updatedProduct.code, updateCode);
  TestValidator.equals(
    "product section updated",
    updatedProduct.shopping_mall_section_id,
    newSection.id,
  );
  TestValidator.equals(
    "product status updated",
    updatedProduct.status,
    "Paused",
  );
  TestValidator.equals(
    "product business_status updated",
    updatedProduct.business_status,
    "Blocked",
  );
  TestValidator.notEquals(
    "product updated_at updated",
    updatedProduct.updated_at,
    createdProduct.updated_at,
  );
  TestValidator.equals(
    "deleted_at should still be null/undefined after update",
    updatedProduct.deleted_at,
    createdProduct.deleted_at,
  );
}
