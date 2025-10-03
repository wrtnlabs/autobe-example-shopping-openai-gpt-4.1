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
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Full seller product registration lifecycle with admin context setup
 *
 * 1. Admin joins and creates channel, section, and category.
 * 2. Seller joins using the created channel and section (and valid info).
 * 3. Seller registers a product referencing the created seller, channel, section,
 *    and category.
 * 4. Checks duplicate code protection.
 * 5. Asserts relationship correctness (IDs match, snapshot existence), and
 *    business rules (status).
 */
export async function test_api_product_registration_by_seller_full_lifecycle(
  connection: api.IConnection,
) {
  // 1. Admin join
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
  } satisfies IShoppingMallAdmin.IJoin;
  const admin = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert(admin);

  // 2. Create channel
  const channelCreateBody = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IShoppingMallChannel.ICreate;
  const channel = await api.functional.shoppingMall.admin.channels.create(
    connection,
    { body: channelCreateBody },
  );
  typia.assert(channel);

  // 3. Create section
  const sectionCreateBody = {
    shopping_mall_channel_id: channel.id,
    code: RandomGenerator.alphaNumeric(6),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    display_order: typia.random<number & tags.Type<"int32">>(),
  } satisfies IShoppingMallSection.ICreate;
  const section =
    await api.functional.shoppingMall.admin.channels.sections.create(
      connection,
      { channelId: channel.id, body: sectionCreateBody },
    );
  typia.assert(section);

  // 4. Create category
  const categoryCreateBody = {
    shopping_mall_channel_id: channel.id,
    code: RandomGenerator.alphaNumeric(6),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    display_order: typia.random<number & tags.Type<"int32">>(),
  } satisfies IShoppingMallChannelCategory.ICreate;
  const category =
    await api.functional.shoppingMall.admin.channels.categories.create(
      connection,
      { channelId: channel.id, body: categoryCreateBody },
    );
  typia.assert(category);

  // 5. Seller join using valid context
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(2),
    phone: RandomGenerator.mobile(),
    shopping_mall_channel_id: channel.id,
    shopping_mall_section_id: section.id,
    profile_name: RandomGenerator.name(3),
    kyc_status: "pending",
  } satisfies IShoppingMallSeller.IJoin;
  const seller = await api.functional.auth.seller.join(connection, {
    body: sellerJoinBody,
  });
  typia.assert(seller);
  // Must be linked to correct channel/section
  TestValidator.equals(
    "seller section matches section",
    seller.shopping_mall_section_id,
    section.id,
  );
  TestValidator.equals(
    "seller status is pending or active",
    seller.status === "pending" || seller.status === "active",
    true,
  );
  // KYC status should be 'pending' on join
  TestValidator.equals(
    "seller kyc_status pending",
    seller.kyc_status,
    "pending",
  );

  // 6. Seller registers a product
  const productCode = RandomGenerator.alphaNumeric(12);
  const productCreateBody = {
    shopping_mall_seller_id: seller.id,
    shopping_mall_channel_id: channel.id,
    shopping_mall_section_id: section.id,
    shopping_mall_category_id: category.id,
    code: productCode,
    name: RandomGenerator.name(3),
    status: "Draft",
    business_status: "Pending Approval",
  } satisfies IShoppingMallProduct.ICreate;
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    { body: productCreateBody },
  );
  typia.assert(product);
  // Relationship assertions
  TestValidator.equals(
    "product seller id matches",
    product.shopping_mall_seller_id,
    seller.id,
  );
  TestValidator.equals(
    "product channel id matches",
    product.shopping_mall_channel_id,
    channel.id,
  );
  TestValidator.equals(
    "product section id matches",
    product.shopping_mall_section_id,
    section.id,
  );
  TestValidator.equals(
    "product category id matches",
    product.shopping_mall_category_id,
    category.id,
  );
  TestValidator.equals("product code matches input", product.code, productCode);
  // Business status and status
  TestValidator.equals("product status is Draft", product.status, "Draft");
  TestValidator.equals(
    "product business_status is Pending Approval",
    product.business_status,
    "Pending Approval",
  );
  // Audit (id and created_at present)
  TestValidator.predicate(
    "product id is uuid",
    typeof product.id === "string" && product.id.length > 0,
  );
  TestValidator.predicate(
    "product created_at is ISO date",
    typeof product.created_at === "string" && product.created_at.includes("T"),
  );
  // Check updated_at present
  TestValidator.predicate(
    "product updated_at exists",
    typeof product.updated_at === "string" && product.updated_at.length > 0,
  );
  // 7. Check duplicate code is rejected
  await TestValidator.error("duplicate product code should fail", async () => {
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: { ...productCreateBody, code: productCode },
    });
  });
}
