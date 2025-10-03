import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallChannelCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannelCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductInquiry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductInquiry";
import type { IShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSection";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test soft-deletion of a product inquiry by an admin, verifying audit/evidence
 * preservation and logical deletion behavior.
 *
 * Scenario Steps:
 *
 * 1. Register an admin for channel/section/category/product management.
 * 2. Admin creates a channel (for multi-tenant segregation).
 * 3. Admin creates a section in that channel.
 * 4. Admin creates a category in that channel.
 * 5. Register a seller (for inquiry author).
 * 6. Admin creates a product under seller's ownership, associated with
 *    channel/section/category.
 * 7. Seller (authenticated as seller, using customer API) creates an inquiry for
 *    the product.
 * 8. Admin performs a soft delete (logical deletion) of that inquiry.
 * 9. Attempting a redundant soft-delete of the same inquiry should result in
 *    error, confirming logical deletion state.
 * 10. (Limitation) Because the provided SDK does not contain inquiry GET/listing
 *     endpoints, presence/absence can't be asserted directly, but business flow
 *     and audit trail can be inferred by error on second delete.
 */
export async function test_api_admin_soft_delete_product_inquiry_by_admin(
  connection: api.IConnection,
) {
  // 1. Register an admin
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
  } satisfies IShoppingMallAdmin.IJoin;
  const admin = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert(admin);

  // 2. Admin creates a channel
  const channelCreateBody = {
    code: RandomGenerator.alphaNumeric(6),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IShoppingMallChannel.ICreate;
  const channel = await api.functional.shoppingMall.admin.channels.create(
    connection,
    { body: channelCreateBody },
  );
  typia.assert(channel);

  // 3. Admin creates a section in the channel
  const sectionCreateBody = {
    shopping_mall_channel_id: channel.id,
    code: RandomGenerator.alphaNumeric(6),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    display_order: 0,
  } satisfies IShoppingMallSection.ICreate;
  const section =
    await api.functional.shoppingMall.admin.channels.sections.create(
      connection,
      { channelId: channel.id, body: sectionCreateBody },
    );
  typia.assert(section);

  // 4. Admin creates a category in the channel
  const categoryCreateBody = {
    shopping_mall_channel_id: channel.id,
    code: RandomGenerator.alphaNumeric(5),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    display_order: 0,
  } satisfies IShoppingMallChannelCategory.ICreate;
  const category =
    await api.functional.shoppingMall.admin.channels.categories.create(
      connection,
      { channelId: channel.id, body: categoryCreateBody },
    );
  typia.assert(category);

  // 5. Register a seller (must be used for product and inquiry author)
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    profile_name: RandomGenerator.name(2),
    shopping_mall_channel_id: channel.id,
    shopping_mall_section_id: section.id,
    // kyc_status intentionally omitted since it's optional
  } satisfies IShoppingMallSeller.IJoin;
  const seller = await api.functional.auth.seller.join(connection, {
    body: sellerJoinBody,
  });
  typia.assert(seller);

  // 6. Admin creates a product for the seller
  const productCreateBody = {
    shopping_mall_seller_id: seller.id,
    shopping_mall_channel_id: channel.id,
    shopping_mall_section_id: section.id,
    shopping_mall_category_id: category.id,
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(3),
    status: "active",
    business_status: "approved",
  } satisfies IShoppingMallProduct.ICreate;
  const product = await api.functional.shoppingMall.admin.products.create(
    connection,
    { body: productCreateBody },
  );
  typia.assert(product);

  // 7. Seller (switch context) creates an inquiry for the product as seller-acting-as-customer
  // Re-login as seller to obtain their authentication context
  await api.functional.auth.seller.join(connection, { body: sellerJoinBody });
  // Create the inquiry (customer API, but will mark seller as author)
  const inquiryCreateBody = {
    body: RandomGenerator.paragraph({ sentences: 8 }),
    title: RandomGenerator.paragraph({ sentences: 2 }),
    is_private: true,
  } satisfies IShoppingMallProductInquiry.ICreate;
  const inquiry =
    await api.functional.shoppingMall.customer.products.inquiries.create(
      connection,
      {
        productId: product.id,
        body: inquiryCreateBody,
      },
    );
  typia.assert(inquiry);

  // 8. Admin soft-deletes the inquiry
  // (admin context already authenticated)
  await api.functional.shoppingMall.admin.products.inquiries.erase(connection, {
    productId: product.id,
    inquiryId: inquiry.id,
  });

  // 9. Attempting to soft-delete a logically deleted inquiry should throw error
  await TestValidator.error(
    "Attempting redundant soft-delete of product inquiry after logical deletion must fail",
    async () => {
      await api.functional.shoppingMall.admin.products.inquiries.erase(
        connection,
        {
          productId: product.id,
          inquiryId: inquiry.id,
        },
      );
    },
  );

  // 10. (Limitation) No GET/list API available to check inquiry presence/absence; audit/evidence can be inferred through error on second delete.
}
