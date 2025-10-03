import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallChannelCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannelCategory";
import type { IShoppingMallInquiryAnswer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInquiryAnswer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductInquiry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductInquiry";
import type { IShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSection";

/**
 * Test flow for hard deletion (permanent delete) of a product inquiry answer by
 * admin.
 *
 * Steps:
 *
 * 1. Create admin and authenticate session.
 * 2. Create a shopping mall channel as admin.
 * 3. Create a section under the channel as admin.
 * 4. Create a channel category as admin.
 * 5. Create a product as admin (simulate product data, product assigned to seller
 *    id, etc.)
 * 6. Create an inquiry on the product (as seller endpoint) [simulate
 *    seller/customer context as required].
 * 7. Answer that inquiry (as admin).
 * 8. Delete the answer as admin using erase API.
 * 9. Confirm answer can't be found again or deleted again.
 * 10. Attempt to delete unrelated or invalid answer IDs, confirm access control
 *     errors.
 */
export async function test_api_product_inquiry_answer_hard_delete_by_admin(
  connection: api.IConnection,
) {
  // 1. Create admin and authenticate.
  const adminJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    name: RandomGenerator.name(),
  } satisfies IShoppingMallAdmin.IJoin;
  const adminAuth: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinInput,
    });
  typia.assert(adminAuth);

  // 2. Create channel (admin)
  const channelInput = {
    code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 8 }),
  } satisfies IShoppingMallChannel.ICreate;
  const channel: IShoppingMallChannel =
    await api.functional.shoppingMall.admin.channels.create(connection, {
      body: channelInput,
    });
  typia.assert(channel);

  // 3. Create section (admin)
  const sectionInput = {
    shopping_mall_channel_id: channel.id,
    code: RandomGenerator.alphaNumeric(6),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    display_order: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
    >(),
  } satisfies IShoppingMallSection.ICreate;
  const section: IShoppingMallSection =
    await api.functional.shoppingMall.admin.channels.sections.create(
      connection,
      { channelId: channel.id, body: sectionInput },
    );
  typia.assert(section);

  // 4. Create category (admin)
  const categoryInput = {
    shopping_mall_channel_id: channel.id,
    code: RandomGenerator.alphaNumeric(7),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    display_order: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<30>
    >(),
  } satisfies IShoppingMallChannelCategory.ICreate;
  const category: IShoppingMallChannelCategory =
    await api.functional.shoppingMall.admin.channels.categories.create(
      connection,
      { channelId: channel.id, body: categoryInput },
    );
  typia.assert(category);

  // 5. Create product (admin)
  // Use random value for sellerId (simulate) and required fields
  const productInput = {
    shopping_mall_seller_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_channel_id: channel.id,
    shopping_mall_section_id: section.id,
    shopping_mall_category_id: category.id,
    code: RandomGenerator.alphaNumeric(7),
    name: RandomGenerator.name(2),
    status: "Active",
    business_status: "Approved",
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.admin.products.create(connection, {
      body: productInput,
    });
  typia.assert(product);

  // 6. Create inquiry (simulate seller endpoint)
  const inquiryInput = {
    body: RandomGenerator.content({ paragraphs: 1 }),
    title: RandomGenerator.paragraph({ sentences: 2 }),
    is_private: false,
  } satisfies IShoppingMallProductInquiry.ICreate;
  const inquiry: IShoppingMallProductInquiry =
    await api.functional.shoppingMall.seller.products.inquiries.create(
      connection,
      { productId: product.id, body: inquiryInput },
    );
  typia.assert(inquiry);

  // 7. Create answer as admin
  const answerInput = {
    body: RandomGenerator.content({ paragraphs: 1 }),
    official_answer: true,
    moderation_status: "approved",
  } satisfies IShoppingMallInquiryAnswer.ICreate;
  const answer: IShoppingMallInquiryAnswer =
    await api.functional.shoppingMall.admin.products.inquiries.answers.create(
      connection,
      { productId: product.id, inquiryId: inquiry.id, body: answerInput },
    );
  typia.assert(answer);
  TestValidator.equals(
    "answer linked to correct inquiryId",
    answer.shopping_mall_product_inquiry_id,
    inquiry.id,
  );

  // 8. Delete the answer (admin hard delete)
  await api.functional.shoppingMall.admin.products.inquiries.answers.erase(
    connection,
    {
      productId: product.id,
      inquiryId: inquiry.id,
      answerId: answer.id,
    },
  );

  // 9. Attempt to delete the same answer again - should fail (already deleted)
  await TestValidator.error(
    "cannot delete already-deleted answer",
    async () => {
      await api.functional.shoppingMall.admin.products.inquiries.answers.erase(
        connection,
        {
          productId: product.id,
          inquiryId: inquiry.id,
          answerId: answer.id,
        },
      );
    },
  );

  // 10. Attempt to delete answer with wrong answerId - should fail (not found)
  const wrongAnswerId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.error(
    "cannot delete unrelated/invalid answer",
    async () => {
      await api.functional.shoppingMall.admin.products.inquiries.answers.erase(
        connection,
        {
          productId: product.id,
          inquiryId: inquiry.id,
          answerId: wrongAnswerId,
        },
      );
    },
  );
}
