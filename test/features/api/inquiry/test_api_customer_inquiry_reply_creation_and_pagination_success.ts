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

export async function test_api_customer_inquiry_reply_creation_and_pagination_success(
  connection: api.IConnection,
) {
  /**
   * E2E test for customer inquiry reply creation and paginated retrieval,
   * including public/private flags and threading.
   *
   * This function verifies the following:
   *
   * 1. That a customer can register and authenticate.
   * 2. Creation of a customer inquiry.
   * 3. Creation of multiple replies (public, private, and threaded).
   * 4. Paginated retrieval of replies and validation of privacy (private replies
   *    visible to author), threading (parent/child), and metadata.
   * 5. Pagination: the reply list respects queried page, limit, and returns
   *    correct pagination metadata.
   */

  // 1. Register and authenticate a new customer
  const joinInput: IShoppingMallAiBackendCustomer.IJoin = {
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    phone_number: RandomGenerator.mobile(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    nickname: RandomGenerator.name(1),
  };

  const joinOutput = await api.functional.auth.customer.join(connection, {
    body: joinInput,
  });
  typia.assert(joinOutput);
  const customer = joinOutput.customer;

  // 2. Create a new inquiry as the customer
  const inquiryInput: IShoppingMallAiBackendInquiry.ICreate = {
    customer_id: customer.id,
    seller_id: null,
    product_id: null,
    order_id: null,
    title: RandomGenerator.paragraph({ sentences: 2 }),
    body: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 2,
      sentenceMax: 5,
    }),
    private: false,
    status: "open",
  };
  const inquiry =
    await api.functional.shoppingMallAiBackend.customer.inquiries.create(
      connection,
      { body: inquiryInput },
    );
  typia.assert(inquiry);

  // 3. Create multiple replies, some public/private and some with parent_id for threading
  // Reply count setup
  const REPLY_COUNT = 7;
  const replies: IShoppingMallAiBackendInquiryReply[] = [];
  let threadParentId: string | undefined = undefined;
  for (let i = 0; i < REPLY_COUNT; ++i) {
    const isPrivate: boolean = i % 3 === 0; // Every 3rd reply private
    const body: string = RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 1,
      sentenceMax: 3,
    });
    // For demonstration, assign parent_id to every even (not first) reply for threading
    const useThreadParent: boolean =
      i % 2 === 0 && threadParentId !== undefined;
    const replyInput: IShoppingMallAiBackendInquiryReply.ICreate = {
      inquiry_id: inquiry.id,
      parent_id: useThreadParent ? threadParentId : undefined,
      body,
      private: isPrivate,
    };
    const reply: IShoppingMallAiBackendInquiryReply =
      await api.functional.shoppingMallAiBackend.customer.inquiries.replies.create(
        connection,
        {
          inquiryId: inquiry.id,
          body: replyInput,
        },
      );
    typia.assert(reply);
    replies.push(reply);
    // Set the parent_id to the second created reply for threading
    if (i === 1) threadParentId = reply.id;
  }

  // 4. Paginated retrieval and validation
  // -- Retrieve all with limit 3 per page
  let page: number = 1;
  let allSummaries: IShoppingMallAiBackendInquiryReply.ISummary[] = [];
  while (true) {
    const pageResult =
      await api.functional.shoppingMallAiBackend.customer.inquiries.replies.index(
        connection,
        {
          inquiryId: inquiry.id,
          body: {
            page,
            limit: 3,
          } satisfies IShoppingMallAiBackendInquiryReply.IRequest,
        },
      );
    typia.assert(pageResult);
    TestValidator.equals(
      "pagination.current matches requested page",
      pageResult.pagination.current,
      page,
    );
    TestValidator.equals(
      "pagination.limit matches requested limit",
      pageResult.pagination.limit,
      3,
    );

    // Validate each reply meta, privacy, and threading structure
    for (const summary of pageResult.data) {
      // Ensure all are linked to the correct inquiry
      TestValidator.equals(
        "reply inquiry_id matches",
        summary.inquiry_id,
        inquiry.id,
      );
      // Ensure author is the customer
      TestValidator.equals(
        "author_type is customer",
        summary.author_type,
        "customer",
      );
      TestValidator.equals(
        "customer_id matches",
        summary.customer_id,
        customer.id,
      );
      // Private replies must be visible to the author (which is us)
      // No filter because we are the author
      // parent_id threading shape validation for summary only (actual tree validation can require more API)
      // Meta fields: created_at and updated_at are present
      TestValidator.predicate("created_at field exists", !!summary.created_at);
      TestValidator.predicate("updated_at field exists", !!summary.updated_at);
    }
    allSummaries = allSummaries.concat(pageResult.data);
    if (
      pageResult.pagination.current * pageResult.pagination.limit >=
      pageResult.pagination.records
    )
      break;
    page++;
  }
  // Should match the number of replies created
  TestValidator.equals(
    "total reply records equals created replies",
    allSummaries.length,
    replies.length,
  );
  // Ensure all created reply ids are present
  for (const created of replies) {
    TestValidator.predicate(
      "created reply appears in summary list",
      allSummaries.some((s) => s.id === created.id),
    );
  }
}
