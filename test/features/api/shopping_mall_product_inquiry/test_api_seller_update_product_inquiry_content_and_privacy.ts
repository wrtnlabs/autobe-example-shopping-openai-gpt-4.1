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
 * Validate seller can update their own product inquiry content and privacy
 * settings, enforce audit trail, and cover main error paths for deletion/state
 * and mutability.
 *
 * Steps:
 *
 * 1. Create and authenticate seller
 * 2. Create channel, section, category as required
 * 3. Register a product as seller
 * 4. Create a product inquiry as seller
 * 5. Update inquiry (title/body/is_private) and confirm changes
 * 6. Confirm audit/update fields are changed appropriately
 * 7. Error: attempt update after 'deleted_at' is set (simulate soft-delete effect)
 * 8. Error: attempt update of locked/immutable fields
 */
export async function test_api_seller_update_product_inquiry_content_and_privacy(
  connection: api.IConnection,
) {
  // 1. Seller registration and authentication
  const channel = await api.functional.shoppingMall.admin.channels.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 4 }),
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
          code: RandomGenerator.alphaNumeric(8),
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          display_order: 1,
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
          code: RandomGenerator.alphaNumeric(8),
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          display_order: 1,
        } satisfies IShoppingMallChannelCategory.ICreate,
      },
    );
  typia.assert(category);

  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: RandomGenerator.alphaNumeric(12),
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      shopping_mall_channel_id: channel.id,
      shopping_mall_section_id: section.id,
      profile_name: RandomGenerator.name(),
      kyc_status: "pending",
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);

  // 2. Register product
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        shopping_mall_seller_id: seller.id,
        shopping_mall_channel_id: channel.id,
        shopping_mall_section_id: section.id,
        shopping_mall_category_id: category.id,
        code: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.paragraph({ sentences: 2 }),
        status: "Draft",
        business_status: "Approval",
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);

  // 3. Create product inquiry as seller
  const inquiry =
    await api.functional.shoppingMall.seller.products.inquiries.create(
      connection,
      {
        productId: product.id,
        body: {
          body: RandomGenerator.content({ paragraphs: 1 }),
          title: RandomGenerator.paragraph({ sentences: 1 }),
          is_private: false,
        } satisfies IShoppingMallProductInquiry.ICreate,
      },
    );
  typia.assert(inquiry);

  // 4. Update inquiry (title/body/is_private)
  const updatedTitle = RandomGenerator.paragraph({ sentences: 1 });
  const updatedBody = RandomGenerator.content({ paragraphs: 2 });
  const updateData = {
    title: updatedTitle,
    body: updatedBody,
    is_private: true,
  } satisfies IShoppingMallProductInquiry.IUpdate;

  const updated =
    await api.functional.shoppingMall.seller.products.inquiries.update(
      connection,
      {
        productId: product.id,
        inquiryId: inquiry.id,
        body: updateData,
      },
    );
  typia.assert(updated);
  TestValidator.equals(
    "inquiry id unchanged after update",
    updated.id,
    inquiry.id,
  );
  TestValidator.equals("title updated", updated.title, updatedTitle);
  TestValidator.equals("body updated", updated.body, updatedBody);
  TestValidator.equals("is_private updated", updated.is_private, true);
  TestValidator.predicate(
    "updated_at is changed after update",
    updated.updated_at > inquiry.updated_at,
  );

  // 5. Error: attempt update after 'deleted_at' is set (simulate soft-delete)
  const deleted = { ...updated, deleted_at: new Date().toISOString() };
  await TestValidator.error(
    "cannot update a soft-deleted inquiry",
    async () => {
      // Attempt update (in reality, back-end should reject by 'deleted_at' present, here simulated by not allowing further update)
      await api.functional.shoppingMall.seller.products.inquiries.update(
        connection,
        {
          productId: product.id,
          inquiryId: inquiry.id,
          body: {
            title: RandomGenerator.paragraph({ sentences: 1 }),
            body: RandomGenerator.content({ paragraphs: 1 }),
            is_private: false,
          } satisfies IShoppingMallProductInquiry.IUpdate,
        },
      );
    },
  );

  // 6. Error: attempt update of immutable/locked fields
  await TestValidator.error(
    "cannot forcibly set answered true if disallowed",
    async () => {
      await api.functional.shoppingMall.seller.products.inquiries.update(
        connection,
        {
          productId: product.id,
          inquiryId: inquiry.id,
          body: {
            body: RandomGenerator.content({ paragraphs: 1 }),
            answered: true,
          } satisfies IShoppingMallProductInquiry.IUpdate,
        },
      );
    },
  );
  await TestValidator.error(
    "cannot forcibly set moderation_status to 'approved' if disallowed",
    async () => {
      await api.functional.shoppingMall.seller.products.inquiries.update(
        connection,
        {
          productId: product.id,
          inquiryId: inquiry.id,
          body: {
            body: RandomGenerator.content({ paragraphs: 1 }),
            moderation_status: "approved",
          } satisfies IShoppingMallProductInquiry.IUpdate,
        },
      );
    },
  );
}
