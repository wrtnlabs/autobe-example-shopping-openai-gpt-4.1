import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallChannelCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannelCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductInquiry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductInquiry";
import type { IShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSection";

/**
 * E2E test: Product inquiry creation by customer with all prerequisites
 *
 * This test validates that a registered customer can create an inquiry about a
 * product, ensuring all dependencies (channel, section, category, product)
 * exist, that the inquiry's business logic and privacy are enforced, moderation
 * status and audit fields are present, context separation between admin
 * (resource setup) and customer (authoring) is maintained, and error case for
 * non-existent products is handled. All fields are assigned using the explicit
 * DTO definitions provided.
 */
export async function test_api_product_inquiry_creation_by_customer(
  connection: api.IConnection,
) {
  // Step 1: Create admin-side channel
  const channelBody = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IShoppingMallChannel.ICreate;
  const channel = await api.functional.shoppingMall.admin.channels.create(
    connection,
    { body: channelBody },
  );
  typia.assert(channel);

  // Step 2: Create a section in this channel
  const sectionBody = {
    shopping_mall_channel_id: channel.id,
    code: RandomGenerator.alphaNumeric(6),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    display_order: 1,
  } satisfies IShoppingMallSection.ICreate;
  const section =
    await api.functional.shoppingMall.admin.channels.sections.create(
      connection,
      { channelId: channel.id, body: sectionBody },
    );
  typia.assert(section);

  // Step 3: Create a category in this channel
  const categoryBody = {
    shopping_mall_channel_id: channel.id,
    parent_id: null,
    code: RandomGenerator.alphaNumeric(6),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    display_order: 1,
  } satisfies IShoppingMallChannelCategory.ICreate;
  const category =
    await api.functional.shoppingMall.admin.channels.categories.create(
      connection,
      { channelId: channel.id, body: categoryBody },
    );
  typia.assert(category);

  // Step 4: Register a product referencing above
  const productBody = {
    shopping_mall_seller_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_channel_id: channel.id,
    shopping_mall_section_id: section.id,
    shopping_mall_category_id: category.id,
    code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
    status: "Active",
    business_status: "Approval",
  } satisfies IShoppingMallProduct.ICreate;
  const product = await api.functional.shoppingMall.admin.products.create(
    connection,
    { body: productBody },
  );
  typia.assert(product);

  // Step 5: Register and authenticate as customer (for the given channel)
  const customerBody = {
    shopping_mall_channel_id: channel.id,
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IShoppingMallCustomer.IJoin;
  const customer = await api.functional.auth.customer.join(connection, {
    body: customerBody,
  });
  typia.assert(customer);

  // Step 6: Customer creates a product inquiry (all fields, including optional title)
  const inquiryBody = {
    body: RandomGenerator.paragraph({ sentences: 8 }),
    title: RandomGenerator.paragraph({ sentences: 2 }),
    is_private: true,
  } satisfies IShoppingMallProductInquiry.ICreate;
  const inquiry =
    await api.functional.shoppingMall.customer.products.inquiries.create(
      connection,
      { productId: product.id, body: inquiryBody },
    );
  typia.assert(inquiry);
  TestValidator.equals(
    "linked product id",
    inquiry.shopping_mall_product_id,
    product.id,
  );
  TestValidator.equals(
    "author customer id",
    inquiry.shopping_mall_customer_id,
    customer.id,
  );
  TestValidator.equals("privacy flag", inquiry.is_private, true);
  TestValidator.predicate(
    "inquiry moderation_status non-empty",
    typeof inquiry.moderation_status === "string" &&
      inquiry.moderation_status.length > 0,
  );
  TestValidator.predicate(
    "audit: created_at is ISO datetime",
    typeof inquiry.created_at === "string" &&
      !!inquiry.created_at.match(/^\d{4}-\d{2}-\d{2}T/),
  );
  TestValidator.predicate(
    "audit: updated_at is ISO datetime",
    typeof inquiry.updated_at === "string" &&
      !!inquiry.updated_at.match(/^\d{4}-\d{2}-\d{2}T/),
  );

  // Step 7: Error case - attempt to create an inquiry for non-existent product
  await TestValidator.error(
    "inquiry fails for non-existent product id",
    async () => {
      await api.functional.shoppingMall.customer.products.inquiries.create(
        connection,
        {
          productId: typia.random<string & tags.Format<"uuid">>(),
          body: inquiryBody,
        },
      );
    },
  );
}
