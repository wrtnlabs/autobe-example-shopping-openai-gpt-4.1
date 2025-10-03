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
 * Validates inquiry answer detail exposure for each role (admin, seller/author,
 * unrelated seller).
 *
 * 1. Admin registers, creates channel, section, category for seller onboarding and
 *    product scoping.
 * 2. Seller registers for that channel/section, creates a product, posts an
 *    inquiry (can post on own product for test), and submits an answer marked
 *    as official.
 * 3. Answer detail fetched as: (a) seller/author, (b) unrelated seller (join a 2nd
 *    seller, do not let them see private answer), (c) admin (should have full
 *    audit/mod access).
 * 4. Expectation: author sees all data, unrelated user gets error/no detail, admin
 *    sees all moderation and audit info. Also test for
 *    non-existent/deleted/restricted answers produce error for non-authorized
 *    users.
 */
export async function test_api_inquiry_answer_detail_visibility_by_role(
  connection: api.IConnection,
) {
  // 1. Admin registers
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "adminpass",
      name: RandomGenerator.name(),
    },
  });
  typia.assert(admin);

  // 2. Admin creates channel
  const channel = await api.functional.shoppingMall.admin.channels.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(7),
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph(),
      },
    },
  );
  typia.assert(channel);

  // 3. Admin creates section
  const section =
    await api.functional.shoppingMall.admin.channels.sections.create(
      connection,
      {
        channelId: channel.id,
        body: {
          shopping_mall_channel_id: channel.id,
          code: RandomGenerator.alphaNumeric(8),
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph(),
          display_order: 1,
        },
      },
    );
  typia.assert(section);

  // 4. Admin creates category
  const category =
    await api.functional.shoppingMall.admin.channels.categories.create(
      connection,
      {
        channelId: channel.id,
        body: {
          shopping_mall_channel_id: channel.id,
          code: RandomGenerator.alphaNumeric(8),
          name: RandomGenerator.name(),
          display_order: 1,
        },
      },
    );
  typia.assert(category);

  // 5. Seller registers in given scope
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: "sellerpass",
      name: RandomGenerator.name(),
      profile_name: RandomGenerator.name(),
      shopping_mall_channel_id: channel.id,
      shopping_mall_section_id: section.id,
    },
  });
  typia.assert(seller);

  // 6. Seller creates product
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        shopping_mall_seller_id: seller.id,
        shopping_mall_channel_id: channel.id,
        shopping_mall_section_id: section.id,
        shopping_mall_category_id: category.id,
        code: RandomGenerator.alphaNumeric(7),
        name: RandomGenerator.name(),
        status: "active",
        business_status: "approved",
      },
    },
  );
  typia.assert(product);

  // 7. Seller creates product inquiry
  const inquiry =
    await api.functional.shoppingMall.seller.products.inquiries.create(
      connection,
      {
        productId: product.id,
        body: {
          body: RandomGenerator.paragraph(),
          is_private: true,
          title: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(inquiry);

  // 8. Seller posts answer to own inquiry with moderation as 'approved' and official
  const answer =
    await api.functional.shoppingMall.seller.products.inquiries.answers.create(
      connection,
      {
        productId: product.id,
        inquiryId: inquiry.id,
        body: {
          body: RandomGenerator.paragraph(),
          official_answer: true,
          moderation_status: "approved",
        },
      },
    );
  typia.assert(answer);

  // 9. Fetch answer as seller (should succeed and see all info)
  const answer_seller =
    await api.functional.shoppingMall.products.inquiries.answers.at(
      connection,
      {
        productId: product.id,
        inquiryId: inquiry.id,
        answerId: answer.id,
      },
    );
  typia.assert(answer_seller);
  TestValidator.equals("seller gets full answer", answer_seller, answer);

  // 10. Register unrelated seller
  const seller2Email = typia.random<string & tags.Format<"email">>();
  const seller2 = await api.functional.auth.seller.join(connection, {
    body: {
      email: seller2Email,
      password: "seller2pass",
      name: RandomGenerator.name(),
      profile_name: RandomGenerator.name(),
      shopping_mall_channel_id: channel.id,
      shopping_mall_section_id: section.id,
    },
  });
  typia.assert(seller2);
  // Try to fetch answer as unrelated user (expect error or restricted info)
  await TestValidator.error(
    "unrelated seller cannot see private answer",
    async () => {
      await api.functional.shoppingMall.products.inquiries.answers.at(
        connection,
        {
          productId: product.id,
          inquiryId: inquiry.id,
          answerId: answer.id,
        },
      );
    },
  );

  // 11. Fetch as admin (should get moderation/audit info
  // Re-login as admin (use initial adminEmail/password)
  await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "adminpass",
      name: admin.name,
    },
  });
  const answer_admin =
    await api.functional.shoppingMall.products.inquiries.answers.at(
      connection,
      {
        productId: product.id,
        inquiryId: inquiry.id,
        answerId: answer.id,
      },
    );
  typia.assert(answer_admin);
  TestValidator.equals("admin gets full answer", answer_admin, answer);

  // 12. Attempt fetch for non-existent answer (should error)
  await TestValidator.error("non-existent answer is not visible", async () => {
    await api.functional.shoppingMall.products.inquiries.answers.at(
      connection,
      {
        productId: product.id,
        inquiryId: inquiry.id,
        answerId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  });
}
