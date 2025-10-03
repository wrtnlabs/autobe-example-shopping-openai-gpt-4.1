import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallChannelCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannelCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductInquiry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductInquiry";
import type { IShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSection";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test that a registered seller can create an inquiry on their own product,
 * enforcing proper ownership validation, business audit rules, access control,
 * and moderation logic. Ensures proper seller context (join only), and all
 * hierarchical channel, section, category, and product setup.
 */
export async function test_api_product_inquiry_creation_by_seller(
  connection: api.IConnection,
) {
  // 1. Create a channel as admin
  const channelBody = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph(),
  } satisfies IShoppingMallChannel.ICreate;
  const channel: IShoppingMallChannel =
    await api.functional.shoppingMall.admin.channels.create(connection, {
      body: channelBody,
    });
  typia.assert(channel);

  // 2. Create a section in the channel as admin
  const sectionBody = {
    shopping_mall_channel_id: channel.id,
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph(),
    display_order: typia.random<number & tags.Type<"int32">>(),
  } satisfies IShoppingMallSection.ICreate;
  const section: IShoppingMallSection =
    await api.functional.shoppingMall.admin.channels.sections.create(
      connection,
      { channelId: channel.id, body: sectionBody },
    );
  typia.assert(section);

  // 3. Create a category in the channel as admin
  const categoryBody = {
    shopping_mall_channel_id: channel.id,
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph(),
    display_order: typia.random<number & tags.Type<"int32">>(),
  } satisfies IShoppingMallChannelCategory.ICreate;
  const category: IShoppingMallChannelCategory =
    await api.functional.shoppingMall.admin.channels.categories.create(
      connection,
      { channelId: channel.id, body: categoryBody },
    );
  typia.assert(category);

  // 4. Seller joins with reference to channel and section
  const sellerEmail = RandomGenerator.alphaNumeric(8) + "@test.com";
  const sellerJoinBody = {
    email: sellerEmail,
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    shopping_mall_channel_id: channel.id,
    shopping_mall_section_id: section.id,
    profile_name: RandomGenerator.name(),
    kyc_status: "pending",
  } satisfies IShoppingMallSeller.IJoin;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, { body: sellerJoinBody });
  typia.assert(sellerAuthorized);
  const seller: IShoppingMallSeller.ISummary = sellerAuthorized.seller!;

  // 5. Admin creates a product associated with the seller, channel, section, and category
  const productBody = {
    shopping_mall_seller_id: seller.id,
    shopping_mall_channel_id: channel.id,
    shopping_mall_section_id: section.id,
    shopping_mall_category_id: category.id,
    code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
    status: "active",
    business_status: "approved",
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.admin.products.create(connection, {
      body: productBody,
    });
  typia.assert(product);

  // 6. Seller creates an inquiry on the product
  // (using the seller-authenticated connection, since api.functional.auth.seller.join sets the token)
  const inquiryBody = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
    body: RandomGenerator.content({ paragraphs: 1 }),
    is_private: false,
  } satisfies IShoppingMallProductInquiry.ICreate;
  const inquiry: IShoppingMallProductInquiry =
    await api.functional.shoppingMall.seller.products.inquiries.create(
      connection,
      {
        productId: product.id,
        body: inquiryBody,
      },
    );
  typia.assert(inquiry);

  // 7. Validate linkage and audit fields
  TestValidator.equals(
    "inquiry references correct product",
    inquiry.shopping_mall_product_id,
    product.id,
  );
  TestValidator.equals(
    "inquiry authored by seller",
    inquiry.shopping_mall_seller_id,
    seller.id,
  );
  TestValidator.equals(
    "inquiry not authored by customer",
    inquiry.shopping_mall_customer_id,
    null,
  );
  TestValidator.equals(
    "inquiry moderation status set",
    typeof inquiry.moderation_status,
    "string",
  );
  TestValidator.predicate(
    "inquiry has valid UUID id",
    typeof inquiry.id === "string" && inquiry.id.length > 0,
  );
  TestValidator.equals(
    "inquiry answered flag is false",
    inquiry.answered,
    false,
  );
  TestValidator.predicate(
    "inquiry audit created_at present",
    typeof inquiry.created_at === "string" && inquiry.created_at.length > 0,
  );
  TestValidator.predicate(
    "inquiry audit updated_at present",
    typeof inquiry.updated_at === "string" && inquiry.updated_at.length > 0,
  );
}
