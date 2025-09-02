import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendInquiry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendInquiry";
import type { IShoppingMallAiBackendInquiryReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendInquiryReply";

/**
 * Verify customer reply update logic and data integrity.
 *
 * - Register a new customer (authentication context)
 * - Create a new inquiry as that customer
 * - Post a reply to that inquiry as the same customer
 * - Update that reply's content and privacy flag using the correct API
 * - Assert that only expected fields have changed, others are preserved
 */
export async function test_api_customer_inquiry_reply_update_success(
  connection: api.IConnection,
) {
  // Step 1. Register customer
  const joinInput: IShoppingMallAiBackendCustomer.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    phone_number: RandomGenerator.mobile(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    nickname: RandomGenerator.name(1),
  };
  const auth = await api.functional.auth.customer.join(connection, {
    body: joinInput,
  });
  typia.assert(auth);
  const customer = auth.customer;

  // Step 2. Create inquiry as customer
  const inquiryInput: IShoppingMallAiBackendInquiry.ICreate = {
    customer_id: customer.id,
    seller_id: null,
    product_id: null,
    order_id: null,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
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
    "inquiry links to customer",
    inquiry.customer_id,
    customer.id,
  );

  // Step 3. Create initial reply
  const replyInput: IShoppingMallAiBackendInquiryReply.ICreate = {
    inquiry_id: inquiry.id,
    body: RandomGenerator.paragraph({ sentences: 6 }),
    private: false,
  };
  const reply =
    await api.functional.shoppingMallAiBackend.customer.inquiries.replies.create(
      connection,
      { inquiryId: inquiry.id, body: replyInput },
    );
  typia.assert(reply);
  TestValidator.equals("reply links to inquiry", reply.inquiry_id, inquiry.id);
  TestValidator.equals(
    "reply written by customer",
    reply.customer_id,
    customer.id,
  );

  // Step 4. Update the reply
  const newBody = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 4,
    wordMax: 12,
  });
  const newPrivate = true;
  const updateInput: IShoppingMallAiBackendInquiryReply.IUpdate = {
    body: newBody,
    private: newPrivate,
  };
  const updated =
    await api.functional.shoppingMallAiBackend.customer.inquiries.replies.update(
      connection,
      { inquiryId: inquiry.id, replyId: reply.id, body: updateInput },
    );
  typia.assert(updated);
  TestValidator.equals(
    "reply id remains unchanged after update",
    updated.id,
    reply.id,
  );
  TestValidator.equals(
    "author type remains customer",
    updated.author_type,
    "customer",
  );
  TestValidator.equals(
    "customer id preserved on update",
    updated.customer_id,
    customer.id,
  );
  TestValidator.equals(
    "inquiry id preserved on update",
    updated.inquiry_id,
    inquiry.id,
  );
  TestValidator.notEquals(
    "body text changed after reply update",
    updated.body,
    reply.body,
  );
  TestValidator.equals(
    "privacy flag changed after update",
    updated.private,
    newPrivate,
  );
  TestValidator.notEquals(
    "updated_at changed after update",
    updated.updated_at,
    reply.updated_at,
  );
  TestValidator.equals(
    "created_at remains unchanged after update",
    updated.created_at,
    reply.created_at,
  );
}
