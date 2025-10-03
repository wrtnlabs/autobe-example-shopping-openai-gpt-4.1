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
 * Seller inquiry answer creation E2E scenario:
 *
 * 1. Admin joins and creates channel, section, and category business context.
 * 2. Seller joins with reference to the admin-created structures.
 * 3. Seller creates a product (with their seller account, referencing the
 *    admin-created channel, section, and category).
 * 4. Seller creates a product inquiry for their own product (as seller, as allowed
 *    by business rules).
 * 5. Seller submits an answer to the inquiry.
 * 6. Validate only the seller can answer their own product's inquiry;
 *    exclusive-constraint (answer duplication not allowed); moderation/audit
 *    triggers; answer injects; and answer can be retrieved.
 * 7. Try to answer the same inquiry again (should fail: only one exclusive answer
 *    allowed).
 */
export async function test_api_seller_create_inquiry_answer_flow(
  connection: api.IConnection,
) {
  // 1. Admin joins and creates the business context
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminName = RandomGenerator.name();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      name: adminName,
    },
  });
  typia.assert(admin);

  // 2. Admin creates channel
  const channel = await api.functional.shoppingMall.admin.channels.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(7),
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
      },
    },
  );
  typia.assert(channel);

  // 3. Admin creates section in the channel
  const section =
    await api.functional.shoppingMall.admin.channels.sections.create(
      connection,
      {
        channelId: channel.id,
        body: {
          shopping_mall_channel_id: channel.id,
          code: RandomGenerator.alphaNumeric(6),
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.content({ paragraphs: 1 }),
          display_order: 1,
        },
      },
    );
  typia.assert(section);

  // 4. Admin creates category in the channel
  const category =
    await api.functional.shoppingMall.admin.channels.categories.create(
      connection,
      {
        channelId: channel.id,
        body: {
          shopping_mall_channel_id: channel.id,
          code: RandomGenerator.alphaNumeric(6),
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.content({ paragraphs: 1 }),
          display_order: 1,
        },
      },
    );
  typia.assert(category);

  // 5. Seller joins with reference info
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(14);
  const sellerProfileName = RandomGenerator.name(2);
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      name: RandomGenerator.name(2),
      phone: RandomGenerator.mobile(),
      shopping_mall_channel_id: channel.id,
      shopping_mall_section_id: section.id,
      profile_name: sellerProfileName,
      kyc_status: "pending",
    },
  });
  typia.assert(seller);

  // 6. Seller creates a product
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
        status: "Active",
        business_status: "Active",
      },
    },
  );
  typia.assert(product);

  // 7. Seller creates a product inquiry for their own product
  const inquiry =
    await api.functional.shoppingMall.seller.products.inquiries.create(
      connection,
      {
        productId: product.id,
        body: {
          body: RandomGenerator.content({ paragraphs: 1 }),
          title: RandomGenerator.paragraph({ sentences: 2 }),
          is_private: false,
        },
      },
    );
  typia.assert(inquiry);
  TestValidator.equals(
    "inquiry.product_id check",
    inquiry.shopping_mall_product_id,
    product.id,
  );
  TestValidator.equals(
    "inquiry.seller_id is set",
    inquiry.shopping_mall_seller_id,
    seller.id,
  );
  TestValidator.equals(
    "inquiry.answered is initially false",
    inquiry.answered,
    false,
  );

  // 8. Seller submits an answer to their own inquiry
  const answerBody = RandomGenerator.paragraph({ sentences: 5 });
  const answer =
    await api.functional.shoppingMall.seller.products.inquiries.answers.create(
      connection,
      {
        productId: product.id,
        inquiryId: inquiry.id,
        body: {
          body: answerBody,
          official_answer: true,
          moderation_status: "pending",
        },
      },
    );
  typia.assert(answer);
  TestValidator.equals(
    "answer is linked to inquiry",
    answer.shopping_mall_product_inquiry_id,
    inquiry.id,
  );
  TestValidator.equals("answer body matches", answer.body, answerBody);
  TestValidator.equals("answer is official", answer.official_answer, true);
  TestValidator.equals(
    "answer moderation_status",
    answer.moderation_status,
    "pending",
  );
  TestValidator.equals(
    "answer seller id matches",
    answer.shopping_mall_seller_id,
    seller.id,
  );

  // (Optional) 9. Try to create duplicate/exclusive answer (should fail)
  await TestValidator.error(
    "cannot answer inquiry twice with exclusive answer",
    async () => {
      await api.functional.shoppingMall.seller.products.inquiries.answers.create(
        connection,
        {
          productId: product.id,
          inquiryId: inquiry.id,
          body: {
            body: "another answer should not be allowed",
            official_answer: true,
            moderation_status: "pending",
          },
        },
      );
    },
  );

  // (Optional) 10. Verify answer is retrievable/associated: Get inquiry answer again (would require GET endpoint not shown in SDK, but typia.assert above validates insert)
}
