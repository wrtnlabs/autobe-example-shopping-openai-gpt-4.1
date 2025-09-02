import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendInquiry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendInquiry";
import type { IShoppingMallAiBackendInquiryReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendInquiryReply";

/**
 * Validate that a customer can create a reply for their own inquiry.
 *
 * This test simulates the complete business flow where a customer account
 * is created and authenticated, then creates an inquiry, and subsequently
 * adds a reply to that inquiry using the POST endpoint. The test
 * validates:
 *
 * 1. Successful registration and authentication of a unique customer
 * 2. Creation of a new inquiry under that customer account
 * 3. Creation of a reply to the inquiry as the same customer
 * 4. Reply response contains correct customer author info, content/body,
 *    inquiry linkage, and audit information
 */
export async function test_api_inquiry_reply_create_by_customer_success(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new customer
  const joinInput: IShoppingMallAiBackendCustomer.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    phone_number: RandomGenerator.mobile(),
    password: RandomGenerator.alphaNumeric(16),
    name: RandomGenerator.name(),
    nickname: RandomGenerator.name(1),
  };
  const joinResp = await api.functional.auth.customer.join(connection, {
    body: joinInput,
  });
  typia.assert(joinResp);
  TestValidator.equals(
    "joined customer email matches input",
    joinResp.customer.email,
    joinInput.email,
  );
  const customerId = joinResp.customer.id;

  // 2. Create a new inquiry as the authenticated customer
  const inquiryInput: IShoppingMallAiBackendInquiry.ICreate = {
    customer_id: customerId,
    seller_id: null,
    product_id: null,
    order_id: null,
    title: RandomGenerator.paragraph({ sentences: 4 }),
    body: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 8,
      sentenceMax: 12,
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
  TestValidator.equals(
    "inquiry customer_id matches",
    inquiry.customer_id,
    customerId,
  );
  const inquiryId = inquiry.id;

  // 3. Create a reply to the above inquiry as the same customer
  const replyInput: IShoppingMallAiBackendInquiryReply.ICreate = {
    inquiry_id: inquiryId,
    body: RandomGenerator.paragraph({ sentences: 8 }),
    private: false,
  };
  const reply =
    await api.functional.shoppingMallAiBackend.customer.inquiries.replies.create(
      connection,
      {
        inquiryId: inquiryId,
        body: replyInput,
      },
    );
  typia.assert(reply);

  // 4. Validate the reply content and linkage
  TestValidator.equals(
    "reply inquiry_id matches input",
    reply.inquiry_id,
    inquiryId,
  );
  TestValidator.equals(
    "reply author is customer",
    reply.author_type,
    "customer",
  );
  TestValidator.equals(
    "reply customer_id matches account",
    reply.customer_id,
    customerId,
  );
  TestValidator.equals("reply body matches", reply.body, replyInput.body);
  TestValidator.predicate(
    "reply audit field (created_at) is present",
    typeof reply.created_at === "string" && !!reply.created_at,
  );
  TestValidator.equals(
    "reply private flag reflects input",
    reply.private,
    replyInput.private,
  );
  TestValidator.equals(
    "reply parent_id is undefined or null for root reply",
    reply.parent_id ?? null,
    null,
  );
}
