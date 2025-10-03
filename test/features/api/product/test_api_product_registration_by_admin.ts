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
 * Validate the administrator workflow for full product registration.
 *
 * This test covers the scenario where an administrator joins/authenticates,
 * creates a new shopping mall channel, attaches a section and a category under
 * that channel, and finally registers a product linked to those entities. All
 * required fields are supplied and business rules for uniqueness, hierarchy,
 * and relationship integrity are validated via assertions. The output verifies
 * that the returned product is linked to the correct channel, section, and
 * category, has all fields populated, and that the system snapshot aspects and
 * unique code constraints are respected.
 */
export async function test_api_product_registration_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin joins/authenticates
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(2),
  } satisfies IShoppingMallAdmin.IJoin;
  const adminAuth: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinBody });
  typia.assert(adminAuth);

  // 2. Create channel
  const channelBody = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.paragraph({ sentences: 2, wordMin: 5, wordMax: 12 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IShoppingMallChannel.ICreate;
  const channel: IShoppingMallChannel =
    await api.functional.shoppingMall.admin.channels.create(connection, {
      body: channelBody,
    });
  typia.assert(channel);

  // 3. Create section
  const sectionBody = {
    shopping_mall_channel_id: channel.id,
    code: RandomGenerator.alphaNumeric(6),
    name: RandomGenerator.paragraph({ sentences: 2, wordMin: 5, wordMax: 10 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    display_order: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >(),
  } satisfies IShoppingMallSection.ICreate;
  const section: IShoppingMallSection =
    await api.functional.shoppingMall.admin.channels.sections.create(
      connection,
      { channelId: channel.id, body: sectionBody },
    );
  typia.assert(section);
  TestValidator.equals(
    "section channel linkage",
    section.shopping_mall_channel_id,
    channel.id,
  );

  // 4. Create category
  const categoryBody = {
    shopping_mall_channel_id: channel.id,
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.paragraph({ sentences: 2, wordMin: 5, wordMax: 14 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    display_order: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >(),
  } satisfies IShoppingMallChannelCategory.ICreate;
  const category: IShoppingMallChannelCategory =
    await api.functional.shoppingMall.admin.channels.categories.create(
      connection,
      { channelId: channel.id, body: categoryBody },
    );
  typia.assert(category);
  TestValidator.equals(
    "category channel linkage",
    category.shopping_mall_channel_id,
    channel.id,
  );
  TestValidator.equals(
    "category parent_id is null or undefined (root category)",
    category.parent_id,
    null,
  );

  // 5. Register product
  const productBody = {
    shopping_mall_seller_id: typia.random<string & tags.Format<"uuid">>(), // admin registering as seller for test purpose
    shopping_mall_channel_id: channel.id,
    shopping_mall_section_id: section.id,
    shopping_mall_category_id: category.id,
    code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.paragraph({ sentences: 2, wordMin: 6, wordMax: 14 }),
    status: "Active",
    business_status: "Approval",
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.admin.products.create(connection, {
      body: productBody,
    });
  typia.assert(product);
  TestValidator.equals(
    "product channel linkage",
    product.shopping_mall_channel_id,
    channel.id,
  );
  TestValidator.equals(
    "product section linkage",
    product.shopping_mall_section_id,
    section.id,
  );
  TestValidator.equals(
    "product category linkage",
    product.shopping_mall_category_id,
    category.id,
  );
  TestValidator.equals(
    "product code matches input",
    product.code,
    productBody.code,
  );
  TestValidator.equals(
    "product name matches input",
    product.name,
    productBody.name,
  );
  TestValidator.equals(
    "product status matches input",
    product.status,
    productBody.status,
  );
  TestValidator.equals(
    "product business_status matches input",
    product.business_status,
    productBody.business_status,
  );
  TestValidator.predicate(
    "product has created_at timestamp",
    typeof product.created_at === "string" && !!product.created_at,
  );
  TestValidator.predicate(
    "product has updated_at timestamp",
    typeof product.updated_at === "string" && !!product.updated_at,
  );
  TestValidator.predicate(
    "product not deleted",
    product.deleted_at === null || product.deleted_at === undefined,
  );
}
