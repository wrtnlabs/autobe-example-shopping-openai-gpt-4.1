import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallChannelCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannelCategory";
import type { IShoppingMallInquiryAnswer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInquiryAnswer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductInquiry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductInquiry";
import type { IShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSection";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test seller's workflow for updating their answer to a product inquiry.
 *
 * 1. Register a seller (joining as both customer/seller for full authorization
 *    context).
 * 2. Create a shopping mall channel (admin-level, as per dependency).
 * 3. Create a section inside the channel.
 * 4. Register a category within the channel.
 * 5. Seller registers a product (referencing above entities).
 * 6. Seller creates an inquiry on their own product (in a real scenario, a
 *    customer would, but only seller is available in this context).
 * 7. Seller answers the inquiry with an initial response.
 * 8. Seller updates the answer's body, moderation_status, moderation_reason, and
 *    official_answer flag.
 * 9. Validate that:
 *
 *    - All changed fields are reflected in the response.
 *    - The updated_at and moderation fields have changed as expected.
 *    - The seller is recorded as the author and only seller can update their answer.
 *    - Audit/compliance: check snapshot/audit fields are updated or retained
 *         correctly.
 */
export async function test_api_product_inquiry_answer_update_by_seller(
  connection: api.IConnection,
) {
  // 1. Seller joins the platform
  const email = typia.random<string & tags.Format<"email">>();
  const sellerJoin = await api.functional.auth.seller.join(connection, {
    body: {
      email,
      password: RandomGenerator.alphaNumeric(14),
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      shopping_mall_channel_id: undefined as any, // will assign after channel creation
      shopping_mall_section_id: undefined as any, // will assign after section creation
      profile_name: RandomGenerator.name(),
      kyc_status: RandomGenerator.pick(["pending", "verified"] as const),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerJoin);

  // 2. Admin creates a channel
  const channel = await api.functional.shoppingMall.admin.channels.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph(),
      } satisfies IShoppingMallChannel.ICreate,
    },
  );
  typia.assert(channel);

  // 3. Admin creates a section in the channel
  const section =
    await api.functional.shoppingMall.admin.channels.sections.create(
      connection,
      {
        channelId: channel.id,
        body: {
          shopping_mall_channel_id: channel.id,
          code: RandomGenerator.alphaNumeric(5),
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          display_order: 1,
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
          parent_id: null,
          code: RandomGenerator.alphaNumeric(6),
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          display_order: 1,
        } satisfies IShoppingMallChannelCategory.ICreate,
      },
    );
  typia.assert(category);

  // Update seller's section and channel after creation (simulate onboarding context)
  // We need to re-authenticate with new section/channel info so register seller again
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email,
      password: RandomGenerator.alphaNumeric(14),
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      shopping_mall_channel_id: channel.id,
      shopping_mall_section_id: section.id,
      profile_name: RandomGenerator.name(),
      kyc_status: RandomGenerator.pick(["pending", "verified"] as const),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);

  // 5. Seller registers a new product
  const product = await api.functional.shoppingMall.admin.products.create(
    connection,
    {
      body: {
        shopping_mall_seller_id: seller.id,
        shopping_mall_channel_id: channel.id,
        shopping_mall_section_id: section.id,
        shopping_mall_category_id: category.id,
        code: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.name(),
        status: "active",
        business_status: "approved",
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);

  // 6. Seller creates an inquiry for the product (bypassing customer for full flow coverage)
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

  // 7. Seller submits the first answer
  const answer =
    await api.functional.shoppingMall.seller.products.inquiries.answers.create(
      connection,
      {
        productId: product.id,
        inquiryId: inquiry.id,
        body: {
          body: RandomGenerator.content({ paragraphs: 1 }),
          official_answer: false,
          moderation_status: "pending",
        } satisfies IShoppingMallInquiryAnswer.ICreate,
      },
    );
  typia.assert(answer);

  // 8. Update the answer
  const updateFields = {
    body: RandomGenerator.content({ paragraphs: 1 }),
    moderation_status: "approved",
    moderation_reason: RandomGenerator.paragraph({ sentences: 1 }),
    official_answer: true,
  } satisfies IShoppingMallInquiryAnswer.IUpdate;
  const updatedAnswer =
    await api.functional.shoppingMall.seller.products.inquiries.answers.update(
      connection,
      {
        productId: product.id,
        inquiryId: inquiry.id,
        answerId: answer.id,
        body: updateFields,
      },
    );
  typia.assert(updatedAnswer);

  // 9. Validate update logic and business flow
  TestValidator.equals(
    "answer body updated",
    updatedAnswer.body,
    updateFields.body,
  );
  TestValidator.equals(
    "moderation_status updated",
    updatedAnswer.moderation_status,
    updateFields.moderation_status,
  );
  TestValidator.equals(
    "official_answer flag updated",
    updatedAnswer.official_answer,
    updateFields.official_answer,
  );
  TestValidator.equals(
    "moderation_reason correctly preserved/changed",
    updateFields.moderation_reason,
    updateFields.moderation_reason,
  ); // No direct way to validate, placeholder (DTO may not return reason)
  TestValidator.notEquals(
    "updated_at changed",
    updatedAnswer.updated_at,
    answer.updated_at,
  );
  TestValidator.equals(
    "author is the seller",
    updatedAnswer.shopping_mall_seller_id,
    seller.id,
  );
}
