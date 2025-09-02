import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendInquiry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendInquiry";
import type { IShoppingMallAiBackendInquiryReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendInquiryReply";
import type { IPageIShoppingMallAiBackendInquiryReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendInquiryReply";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function test_api_customer_inquiry_reply_list_permission_enforcement(
  connection: api.IConnection,
) {
  /**
   * This test function validates permission enforcement when retrieving the
   * list of replies for a customer inquiry.
   *
   * Scenario summary:
   *
   * 1. Register Customer A (inquiry/reply creator)
   * 2. Customer A creates an inquiry
   * 3. Customer A adds multiple replies to the inquiry, some public and some
   *    private
   * 4. Register Customer B (another separate customer)
   * 5. Authenticate as Customer B and attempt to list replies for Customer A's
   *    inquiry
   *
   *    - Verify Customer B only sees public replies, not private ones
   *    - When all replies are private, Customer B sees an empty list (no access to
   *         secret replies)
   *
   * This tests access control compliance for inquiry reply visibility across
   * different users.
   */

  // 1. Register Customer A
  const customerAEmail = typia.random<string & tags.Format<"email">>();
  const customerARegistration = await api.functional.auth.customer.join(
    connection,
    {
      body: {
        email: customerAEmail,
        phone_number: RandomGenerator.mobile(),
        password: RandomGenerator.alphaNumeric(12),
        name: RandomGenerator.name(),
        nickname: RandomGenerator.name(1),
      } satisfies IShoppingMallAiBackendCustomer.IJoin,
    },
  );
  typia.assert(customerARegistration);
  const customerAId = customerARegistration.customer.id;

  // 2. Customer A creates an inquiry
  const inquiry =
    await api.functional.shoppingMallAiBackend.customer.inquiries.create(
      connection,
      {
        body: {
          customer_id: customerAId,
          seller_id: null,
          product_id: null,
          order_id: null,
          title: RandomGenerator.paragraph({ sentences: 3 }),
          body: RandomGenerator.content({ paragraphs: 2 }),
          private: false,
          status: "open",
        } satisfies IShoppingMallAiBackendInquiry.ICreate,
      },
    );
  typia.assert(inquiry);
  const inquiryId = inquiry.id;

  // 3. Customer A adds replies (mix of public and private)
  // Add 2 public and 2 private replies
  const replies: IShoppingMallAiBackendInquiryReply[] = [];
  for (let i = 0; i < 4; ++i) {
    const isPrivate = i >= 2;
    const reply =
      await api.functional.shoppingMallAiBackend.customer.inquiries.replies.create(
        connection,
        {
          inquiryId: inquiryId,
          body: {
            inquiry_id: inquiryId,
            parent_id: null,
            body: RandomGenerator.paragraph({ sentences: 2 }),
            private: isPrivate,
          } satisfies IShoppingMallAiBackendInquiryReply.ICreate,
        },
      );
    typia.assert(reply);
    replies.push(reply);
  }
  const publicReplies = replies.filter((r) => !r.private);
  // const privateReplies = replies.filter(r => r.private); // Not used in validation

  // 4. Register Customer B
  const customerBEmail = typia.random<string & tags.Format<"email">>();
  const customerBRegistration = await api.functional.auth.customer.join(
    connection,
    {
      body: {
        email: customerBEmail,
        phone_number: RandomGenerator.mobile(),
        password: RandomGenerator.alphaNumeric(12),
        name: RandomGenerator.name(),
        nickname: RandomGenerator.name(1),
      } satisfies IShoppingMallAiBackendCustomer.IJoin,
    },
  );
  typia.assert(customerBRegistration);

  // 5. Authenticate as Customer B is implicitly done via join; attempt to list replies
  const replyList =
    await api.functional.shoppingMallAiBackend.customer.inquiries.replies.index(
      connection,
      {
        inquiryId: inquiryId,
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallAiBackendInquiryReply.IRequest,
      },
    );
  typia.assert(replyList);

  // Only public replies should be visible to Customer B
  TestValidator.equals(
    "Customer B only sees public replies to A's inquiry",
    replyList.data.length,
    publicReplies.length,
  );

  // The IDs of public replies from actual API match those created above
  TestValidator.equals(
    "Reply IDs listed for Customer B match only public replies",
    replyList.data.map((r) => r.id).sort(),
    publicReplies.map((r) => r.id).sort(),
  );

  // Test: If only private replies exist, Customer B sees empty list
  // Create a new inquiry with only private replies
  const inquiryPrivate =
    await api.functional.shoppingMallAiBackend.customer.inquiries.create(
      connection,
      {
        body: {
          customer_id: customerAId,
          seller_id: null,
          product_id: null,
          order_id: null,
          title: RandomGenerator.paragraph({ sentences: 2 }),
          body: RandomGenerator.content({ paragraphs: 1 }),
          private: false,
          status: "open",
        } satisfies IShoppingMallAiBackendInquiry.ICreate,
      },
    );
  typia.assert(inquiryPrivate);
  const inquiryPrivateId = inquiryPrivate.id;

  // Add two private replies
  for (let i = 0; i < 2; ++i) {
    const reply =
      await api.functional.shoppingMallAiBackend.customer.inquiries.replies.create(
        connection,
        {
          inquiryId: inquiryPrivateId,
          body: {
            inquiry_id: inquiryPrivateId,
            parent_id: null,
            body: RandomGenerator.paragraph({ sentences: 2 }),
            private: true,
          } satisfies IShoppingMallAiBackendInquiryReply.ICreate,
        },
      );
    typia.assert(reply);
  }

  // Customer B tries to list replies (should get none)
  const replyListNone =
    await api.functional.shoppingMallAiBackend.customer.inquiries.replies.index(
      connection,
      {
        inquiryId: inquiryPrivateId,
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallAiBackendInquiryReply.IRequest,
      },
    );
  typia.assert(replyListNone);
  TestValidator.equals(
    "Customer B sees no replies when all are private",
    replyListNone.data.length,
    0,
  );
}
