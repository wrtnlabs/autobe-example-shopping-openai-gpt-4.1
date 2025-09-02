import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IShoppingMallAiBackendInquiry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendInquiry";
import type { IShoppingMallAiBackendInquiryReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendInquiryReply";

export async function test_api_admin_inquiry_reply_creation_success(
  connection: api.IConnection,
) {
  /**
   * E2E: Admin successfully creates a reply to a customer inquiry.
   *
   * Flow:
   *
   * 1. Register and login as a new admin (establish authenticated admin session).
   * 2. Register and login as a new customer (establish authenticated customer
   *    session).
   * 3. Customer creates a new inquiry.
   * 4. Switch back to admin session.
   * 5. Admin creates a reply to the inquiry.
   * 6. Validate reply fields -- confirm it is linked to correct inquiry and
   *    accurately reflects input.
   *
   * This test ensures the full workflow of multi-actor inquiry handling: from
   * foundational user onboarding, through cross-role session management, to
   * admin reply creation and business validation.
   */

  // 1. Register & login admin
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminUsername = (
    RandomGenerator.name(1).replace(/\s+/g, "").toLowerCase() +
    RandomGenerator.alphaNumeric(8)
  ).slice(0, 20);
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPhone = RandomGenerator.mobile();
  const adminJoinInput = {
    username: adminUsername,
    password_hash: adminPassword, // Use plain password here for join/login testability
    name: RandomGenerator.name(),
    email: adminEmail,
    is_active: true,
    phone_number: adminPhone,
  } satisfies IShoppingMallAiBackendAdmin.ICreate;
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: adminJoinInput,
  });
  typia.assert(adminAuth);

  await api.functional.auth.admin.login(connection, {
    body: {
      username: adminUsername,
      password: adminPassword,
    } satisfies IShoppingMallAiBackendAdmin.ILogin,
  });

  // 2. Register & login customer
  const customerPassword = RandomGenerator.alphaNumeric(16) as string &
    tags.Format<"password">;
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPhone = RandomGenerator.mobile();
  const customerJoinInput = {
    email: customerEmail,
    phone_number: customerPhone,
    password: customerPassword,
    name: RandomGenerator.name(),
    nickname: RandomGenerator.name(1),
  } satisfies IShoppingMallAiBackendCustomer.IJoin;
  const customerAuth = await api.functional.auth.customer.join(connection, {
    body: customerJoinInput,
  });
  typia.assert(customerAuth);

  await api.functional.auth.customer.login(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
    } satisfies IShoppingMallAiBackendCustomer.ILogin,
  });

  // 3. Create inquiry as customer
  const inquiryTitle = RandomGenerator.paragraph({ sentences: 6 });
  const inquiryBody = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 8,
    sentenceMax: 16,
  });
  const isPrivate = RandomGenerator.pick([true, false] as const);
  const inquiryInput = {
    customer_id: customerAuth.customer.id,
    title: inquiryTitle,
    body: inquiryBody,
    private: isPrivate,
    status: "open",
  } satisfies IShoppingMallAiBackendInquiry.ICreate;
  const inquiry =
    await api.functional.shoppingMallAiBackend.customer.inquiries.create(
      connection,
      { body: inquiryInput },
    );
  typia.assert(inquiry);

  // 4. Switch context: login as admin again
  await api.functional.auth.admin.login(connection, {
    body: {
      username: adminUsername,
      password: adminPassword,
    } satisfies IShoppingMallAiBackendAdmin.ILogin,
  });

  // 5. Admin creates a reply to the inquiry
  const replyBody = RandomGenerator.paragraph({
    sentences: 10,
    wordMin: 6,
    wordMax: 14,
  });
  const replyPrivate = RandomGenerator.pick([true, false] as const);
  const replyInput = {
    inquiry_id: inquiry.id,
    body: replyBody,
    private: replyPrivate,
  } satisfies IShoppingMallAiBackendInquiryReply.ICreate;
  const reply =
    await api.functional.shoppingMallAiBackend.admin.inquiries.replies.create(
      connection,
      {
        inquiryId: inquiry.id,
        body: replyInput,
      },
    );
  typia.assert(reply);

  // 6. Validate reply fields
  TestValidator.equals(
    "reply is linked to inquiry",
    reply.inquiry_id,
    inquiry.id,
  );
  TestValidator.equals("reply body matches admin input", reply.body, replyBody);
  TestValidator.equals(
    "reply privacy flag matches",
    reply.private,
    replyPrivate,
  );
  TestValidator.equals(
    "reply author type is admin",
    reply.author_type,
    "admin",
  );
  TestValidator.predicate(
    "reply id is valid UUID format",
    typeof reply.id === "string" && /^[0-9a-fA-F-]{36}$/.test(reply.id),
  );
  TestValidator.predicate(
    "reply created_at is a parseable ISO datetime",
    typeof reply.created_at === "string" &&
      !isNaN(Date.parse(reply.created_at)),
  );
}
