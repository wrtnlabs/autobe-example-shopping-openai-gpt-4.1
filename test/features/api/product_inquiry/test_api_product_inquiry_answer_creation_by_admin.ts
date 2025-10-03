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
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test the complete creation flow of an official answer to a product inquiry by
 * an admin. The test:
 *
 * 1. Registers an admin user for answer rights.
 * 2. Creates a channel, a section, and a category for product linkage.
 * 3. Registers a product as test subject.
 * 4. Registers and logs in a seller, who then submits a product inquiry.
 * 5. Switches back to admin and posts an official answer to the inquiry. The
 *    answer must be linked to the appropriate product and inquiry, have
 *    official status, and correct moderation/audit fields.
 */
export async function test_api_product_inquiry_answer_creation_by_admin(
  connection: api.IConnection,
) {
  // 1. Register admin and gain session
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPwd = RandomGenerator.alphaNumeric(12);
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPwd,
        name: RandomGenerator.name(),
      } satisfies IShoppingMallAdmin.IJoin,
    });
  typia.assert(admin);

  // 2. Create channel
  const channelCreate = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 8 }),
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 4,
      sentenceMax: 8,
    }),
  } satisfies IShoppingMallChannel.ICreate;
  const channel = await api.functional.shoppingMall.admin.channels.create(
    connection,
    { body: channelCreate },
  );
  typia.assert(channel);

  // 3. Create section in channel
  const sectionCreate = {
    shopping_mall_channel_id: channel.id,
    code: RandomGenerator.alphaNumeric(5),
    name: RandomGenerator.paragraph({ sentences: 1, wordMin: 3, wordMax: 8 }),
    display_order: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<1000>
    >() satisfies number as number,
    description: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 3,
      wordMax: 10,
    }),
  } satisfies IShoppingMallSection.ICreate;
  const section =
    await api.functional.shoppingMall.admin.channels.sections.create(
      connection,
      {
        channelId: channel.id,
        body: sectionCreate,
      },
    );
  typia.assert(section);
  TestValidator.equals(
    "section.channel",
    section.shopping_mall_channel_id,
    channel.id,
  );

  // 4. Create category in channel
  const categoryCreate = {
    shopping_mall_channel_id: channel.id,
    code: RandomGenerator.alphaNumeric(6),
    name: RandomGenerator.paragraph({ sentences: 1, wordMin: 3, wordMax: 8 }),
    display_order: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<1000>
    >() satisfies number as number,
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IShoppingMallChannelCategory.ICreate;
  const category =
    await api.functional.shoppingMall.admin.channels.categories.create(
      connection,
      {
        channelId: channel.id,
        body: categoryCreate,
      },
    );
  typia.assert(category);
  TestValidator.equals(
    "category.channel",
    category.shopping_mall_channel_id,
    channel.id,
  );

  // 5. Register a seller and login as seller
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPwd = RandomGenerator.alphaNumeric(10);
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: sellerPwd,
        name: RandomGenerator.name(),
        shopping_mall_channel_id: channel.id,
        shopping_mall_section_id: section.id,
        profile_name: RandomGenerator.name(2),
        phone: RandomGenerator.mobile(),
        kyc_status: "pending",
      } satisfies IShoppingMallSeller.IJoin,
    });
  typia.assert(seller);

  // 6. Register a product using admin
  const productCreate = {
    shopping_mall_seller_id: seller.id,
    shopping_mall_channel_id: channel.id,
    shopping_mall_section_id: section.id,
    shopping_mall_category_id: category.id,
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.paragraph({ sentences: 1, wordMin: 2, wordMax: 10 }),
    status: "Active",
    business_status: "Approval",
  } satisfies IShoppingMallProduct.ICreate;
  const product = await api.functional.shoppingMall.admin.products.create(
    connection,
    { body: productCreate },
  );
  typia.assert(product);

  // 7. Seller creates product inquiry (must authenticate as seller)
  // Session is already switched from seller.join
  const inquiryCreate = {
    body: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 2,
      sentenceMax: 7,
      wordMin: 3,
      wordMax: 10,
    }),
    title: RandomGenerator.paragraph({ sentences: 2 }),
    is_private: false,
  } satisfies IShoppingMallProductInquiry.ICreate;
  const inquiry: IShoppingMallProductInquiry =
    await api.functional.shoppingMall.seller.products.inquiries.create(
      connection,
      {
        productId: product.id,
        body: inquiryCreate,
      },
    );
  typia.assert(inquiry);
  TestValidator.equals(
    "inquiry.product",
    inquiry.shopping_mall_product_id,
    product.id,
  );
  TestValidator.equals(
    "inquiry.seller",
    inquiry.shopping_mall_seller_id,
    seller.id,
  );
  TestValidator.equals(
    "inquiry.answered before admin answer",
    inquiry.answered,
    false,
  );

  // 8. Switch back to admin session
  await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPwd,
      name: admin.name,
    } satisfies IShoppingMallAdmin.IJoin,
  });

  // 9. Admin creates official answer to inquiry
  const answerCreate = {
    body: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 4,
      sentenceMax: 10,
      wordMin: 4,
      wordMax: 10,
    }),
    official_answer: true,
    moderation_status: "approved",
  } satisfies IShoppingMallInquiryAnswer.ICreate;
  const answer =
    await api.functional.shoppingMall.admin.products.inquiries.answers.create(
      connection,
      {
        productId: product.id,
        inquiryId: inquiry.id,
        body: answerCreate,
      },
    );
  typia.assert(answer);

  // Validation: Linkage and fields
  TestValidator.equals(
    "answer.inquiry",
    answer.shopping_mall_product_inquiry_id,
    inquiry.id,
  );
  TestValidator.equals("answer.body", answer.body, answerCreate.body);
  TestValidator.equals("answer.official_answer", answer.official_answer, true);
  TestValidator.equals(
    "answer.moderation_status",
    answer.moderation_status,
    "approved",
  );
  TestValidator.predicate(
    "answer has admin id",
    typeof answer.shopping_mall_admin_id === "string" &&
      answer.shopping_mall_admin_id.length > 0,
  );
  TestValidator.equals(
    "answer.seller_id is undefined",
    answer.shopping_mall_seller_id,
    undefined,
  );
  TestValidator.predicate(
    "answer.created time",
    typeof answer.created_at === "string" && answer.created_at.length > 0,
  );
  TestValidator.predicate(
    "answer.updated time",
    typeof answer.updated_at === "string" && answer.updated_at.length > 0,
  );
}
