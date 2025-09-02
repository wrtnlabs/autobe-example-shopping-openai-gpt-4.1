import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendInquiry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendInquiry";
import type { IShoppingMallAiBackendInquiryReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendInquiryReply";

/**
 * Test correct visibility and permission enforcement for fetching a single
 * inquiry reply.
 *
 * This function verifies the business rule that only the author of a
 * private inquiry reply can fetch its details, while public replies are
 * accessible to other customers as well. It covers both successful and
 * failure scenarios, comparing expected reply metadata and permission
 * boundaries.
 *
 * Steps:
 *
 * 1. Register customer A and authenticate.
 * 2. Customer A creates a new inquiry (public).
 * 3. Customer A posts two replies on this inquiry: one public, one private.
 * 4. Customer A (author) fetches both replies -- should succeed and metadata
 *    match.
 * 5. Register customer B.
 * 6. Customer B attempts fetches: a. Public reply: allowed b. Private reply:
 *    denied (permission error expected)
 *
 * At each step, all fields are validated for type and business correctness.
 */
export async function test_api_customer_inquiry_reply_detail_authorization_and_visibility(
  connection: api.IConnection,
) {
  // 1. Register and authenticate Customer A
  const customerAEmail = typia.random<string & tags.Format<"email">>();
  const customerAJoin = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerAEmail,
      phone_number: RandomGenerator.mobile(),
      password: "TestPassword1!",
      name: RandomGenerator.name(),
      nickname: RandomGenerator.name(),
    } satisfies IShoppingMallAiBackendCustomer.IJoin,
  });
  typia.assert(customerAJoin);
  const customerAId = customerAJoin.customer.id;

  // 2. Customer A creates a new inquiry
  const inquiryA =
    await api.functional.shoppingMallAiBackend.customer.inquiries.create(
      connection,
      {
        body: {
          customer_id: customerAId,
          seller_id: null,
          product_id: null,
          order_id: null,
          title: RandomGenerator.paragraph({ sentences: 3 }),
          body: RandomGenerator.content({ paragraphs: 1 }),
          private: false,
          status: "open",
        } satisfies IShoppingMallAiBackendInquiry.ICreate,
      },
    );
  typia.assert(inquiryA);
  const inquiryId = inquiryA.id;

  // 3. Customer A posts two replies: public and private
  const publicReply =
    await api.functional.shoppingMallAiBackend.customer.inquiries.replies.create(
      connection,
      {
        inquiryId,
        body: {
          inquiry_id: inquiryId,
          body: RandomGenerator.paragraph({ sentences: 2 }),
          private: false,
        } satisfies IShoppingMallAiBackendInquiryReply.ICreate,
      },
    );
  typia.assert(publicReply);
  const publicReplyId = publicReply.id;

  const privateReply =
    await api.functional.shoppingMallAiBackend.customer.inquiries.replies.create(
      connection,
      {
        inquiryId,
        body: {
          inquiry_id: inquiryId,
          body: RandomGenerator.paragraph({ sentences: 2 }),
          private: true,
        } satisfies IShoppingMallAiBackendInquiryReply.ICreate,
      },
    );
  typia.assert(privateReply);
  const privateReplyId = privateReply.id;

  // 4. Customer A fetches both replies successfully
  const fetchedPublic =
    await api.functional.shoppingMallAiBackend.customer.inquiries.replies.at(
      connection,
      {
        inquiryId,
        replyId: publicReplyId,
      },
    );
  typia.assert(fetchedPublic);
  TestValidator.equals(
    "Public reply is fetched by author",
    fetchedPublic.id,
    publicReplyId,
  );
  TestValidator.equals(
    "Fetched public reply is not private",
    fetchedPublic.private,
    false,
  );
  TestValidator.equals(
    "Author type is customer",
    fetchedPublic.author_type,
    "customer",
  );
  TestValidator.equals(
    "Author customer_id matches",
    fetchedPublic.customer_id,
    customerAId,
  );
  TestValidator.equals(
    "Reply inquiry_id matches created inquiry",
    fetchedPublic.inquiry_id,
    inquiryId,
  );
  TestValidator.equals(
    "Reply seller_id is null as written by customer",
    fetchedPublic.seller_id,
    null,
  );
  TestValidator.equals(
    "Reply parent_id is null (top-level)",
    fetchedPublic.parent_id,
    null,
  );

  const fetchedPrivate =
    await api.functional.shoppingMallAiBackend.customer.inquiries.replies.at(
      connection,
      {
        inquiryId,
        replyId: privateReplyId,
      },
    );
  typia.assert(fetchedPrivate);
  TestValidator.equals(
    "Private reply is fetched by author",
    fetchedPrivate.id,
    privateReplyId,
  );
  TestValidator.equals(
    "Fetched private flag is true",
    fetchedPrivate.private,
    true,
  );
  TestValidator.equals(
    "Author type is customer [private]",
    fetchedPrivate.author_type,
    "customer",
  );
  TestValidator.equals(
    "Author customer_id matches [private]",
    fetchedPrivate.customer_id,
    customerAId,
  );
  TestValidator.equals(
    "Reply inquiry_id matches created inquiry [private]",
    fetchedPrivate.inquiry_id,
    inquiryId,
  );
  TestValidator.equals(
    "Reply seller_id is null as written by customer [private]",
    fetchedPrivate.seller_id,
    null,
  );
  TestValidator.equals(
    "Reply parent_id is null (top-level) [private]",
    fetchedPrivate.parent_id,
    null,
  );

  // 5. Register and authenticate Customer B (as a different user)
  const customerBEmail = typia.random<string & tags.Format<"email">>();
  await api.functional.auth.customer.join(connection, {
    body: {
      email: customerBEmail,
      phone_number: RandomGenerator.mobile(),
      password: "TestPassword2!",
      name: RandomGenerator.name(),
      nickname: RandomGenerator.name(),
    } satisfies IShoppingMallAiBackendCustomer.IJoin,
  });

  // 6a. Customer B fetches public reply (should succeed)
  const fetchedPublicByB =
    await api.functional.shoppingMallAiBackend.customer.inquiries.replies.at(
      connection,
      {
        inquiryId,
        replyId: publicReplyId,
      },
    );
  typia.assert(fetchedPublicByB);
  TestValidator.equals(
    "Public reply is fetched by Customer B",
    fetchedPublicByB.id,
    publicReplyId,
  );
  TestValidator.equals(
    "Fetched public reply is not private as B",
    fetchedPublicByB.private,
    false,
  );
  TestValidator.equals(
    "Reply inquiry_id matches for Customer B",
    fetchedPublicByB.inquiry_id,
    inquiryId,
  );

  // 6b. Customer B attempts to fetch private reply (should fail)
  await TestValidator.error(
    "Customer B denied access to private reply",
    async () => {
      await api.functional.shoppingMallAiBackend.customer.inquiries.replies.at(
        connection,
        {
          inquiryId,
          replyId: privateReplyId,
        },
      );
    },
  );
}
