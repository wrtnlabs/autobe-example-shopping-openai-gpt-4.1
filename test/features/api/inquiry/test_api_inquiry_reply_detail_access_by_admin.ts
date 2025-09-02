import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendSeller";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IShoppingMallAiBackendInquiry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendInquiry";
import type { IShoppingMallAiBackendInquiryReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendInquiryReply";

export async function test_api_inquiry_reply_detail_access_by_admin(
  connection: api.IConnection,
) {
  /**
   * Validate that an admin can access the details of a seller's reply to a
   * customer inquiry.
   *
   * This test covers multi-actor authentication and the cross-role audit access
   * scenario:
   *
   * 1. Register admin and retain credentials
   * 2. Register customer and create inquiry
   * 3. Register and login as seller to reply to inquiry
   * 4. Switch to admin and access seller's reply detail via admin endpoint
   * 5. Assert that all essential reply fields are visible and correct under admin
   *    privilege
   */

  // 1. Register admin and keep credentials
  const adminUsername = RandomGenerator.name().replace(/ /g, "_").slice(0, 32);
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminName = RandomGenerator.name();
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      username: adminUsername,
      password_hash: adminPassword, // Backend will hash as needed
      name: adminName,
      email: adminEmail,
      is_active: true,
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });
  typia.assert(adminJoin);
  // Save admin login info

  // 2. Register customer and login
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphaNumeric(14) as string &
    tags.Format<"password">;
  const customerPhone = RandomGenerator.mobile();
  const customerName = RandomGenerator.name();
  const customerNickname = RandomGenerator.name();
  const customerJoin = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      phone_number: customerPhone,
      password: customerPassword,
      name: customerName,
      nickname: customerNickname,
    } satisfies IShoppingMallAiBackendCustomer.IJoin,
  });
  typia.assert(customerJoin);
  const customerId = customerJoin.customer.id;

  // 3. Customer creates an inquiry
  const inquiryTitle = RandomGenerator.paragraph({ sentences: 3 });
  const inquiryBody = RandomGenerator.content({ paragraphs: 2 });
  const inquiry =
    await api.functional.shoppingMallAiBackend.customer.inquiries.create(
      connection,
      {
        body: {
          customer_id: customerId,
          title: inquiryTitle,
          body: inquiryBody,
          private: false,
          status: "open",
        } satisfies IShoppingMallAiBackendInquiry.ICreate,
      },
    );
  typia.assert(inquiry);
  const inquiryId = inquiry.id;

  // 4. Register seller and login
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(13) as string &
    tags.Format<"password">;
  const businessRegNo = RandomGenerator.alphaNumeric(10);
  const sellerName = RandomGenerator.name();
  await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      business_registration_number: businessRegNo,
      name: sellerName,
    } satisfies IShoppingMallAiBackendSeller.ICreate,
  });
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
    } satisfies IShoppingMallAiBackendSeller.ILogin,
  });

  // 5. Seller posts a reply to inquiry
  const replyBody = RandomGenerator.content({ paragraphs: 1 });
  const reply =
    await api.functional.shoppingMallAiBackend.seller.inquiries.replies.create(
      connection,
      {
        inquiryId,
        body: {
          inquiry_id: inquiryId,
          body: replyBody,
          private: false,
        } satisfies IShoppingMallAiBackendInquiryReply.ICreate,
      },
    );
  typia.assert(reply);
  const replyId = reply.id;

  // 6. Switch to admin account
  await api.functional.auth.admin.login(connection, {
    body: {
      username: adminUsername,
      password: adminPassword,
    } satisfies IShoppingMallAiBackendAdmin.ILogin,
  });

  // 7. As admin, access the inquiry reply detail
  const replyDetail =
    await api.functional.shoppingMallAiBackend.admin.inquiries.replies.at(
      connection,
      {
        inquiryId,
        replyId,
      },
    );
  typia.assert(replyDetail);

  // 8. Validate essential reply detail fields are accessible and accurate
  TestValidator.equals("reply id matches", replyDetail.id, replyId);
  TestValidator.equals("inquiry id matches", replyDetail.inquiry_id, inquiryId);
  TestValidator.equals("reply body matches", replyDetail.body, replyBody);
  TestValidator.equals(
    "author_type is seller",
    replyDetail.author_type,
    "seller",
  );
  TestValidator.predicate(
    "reply detail created_at is a valid date-time",
    typeof replyDetail.created_at === "string" &&
      replyDetail.created_at.length > 0,
  );
  TestValidator.predicate(
    "reply detail updated_at is a valid date-time",
    typeof replyDetail.updated_at === "string" &&
      replyDetail.updated_at.length > 0,
  );
  TestValidator.equals(
    "reply is public (not private)",
    replyDetail.private,
    false,
  );
}
