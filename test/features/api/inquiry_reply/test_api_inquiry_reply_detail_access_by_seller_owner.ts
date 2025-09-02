import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendSeller";
import type { IShoppingMallAiBackendInquiry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendInquiry";
import type { IShoppingMallAiBackendInquiryReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendInquiryReply";

/**
 * Validate that a seller can fetch and view the details of their own reply
 * to an inquiry they own or are authorized for.
 *
 * The test follows these steps:
 *
 * 1. Register and authenticate a seller account (simulate business seller
 *    onboarding). Seller join does not require a password, but login
 *    does--assume a default password for this scenario.
 * 2. Register and authenticate a customer account (for inquiry creation
 *    context).
 * 3. As the customer, create a new inquiry with required fields.
 * 4. Switch authentication to seller (login as seller), using the assumed
 *    password.
 * 5. As the seller, create a reply for the created inquiry (assign body and
 *    private fields).
 * 6. Fetch the reply detail as the seller using seller's access token.
 * 7. Assert that all reply fields (body, private, timestamps, inquiry
 *    association, author_type, author ID) match expectations, showing
 *    correct access and data integrity.
 */
export async function test_api_inquiry_reply_detail_access_by_seller_owner(
  connection: api.IConnection,
) {
  // 1. Register & authenticate seller (assume known initial password for login later)
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerRegNo = RandomGenerator.alphaNumeric(10);
  const sellerName = RandomGenerator.name();
  const defaultSellerPassword = "autobeSellerPwd!123" as const;
  const sellerJoin = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      business_registration_number: sellerRegNo,
      name: sellerName,
    } satisfies IShoppingMallAiBackendSeller.ICreate,
  });
  typia.assert(sellerJoin);
  const sellerId = sellerJoin.seller.id;

  // 2. Register & authenticate customer
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = typia.random<string & tags.Format<"password">>();
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

  // 3. As customer, create inquiry
  const inquiryTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 10,
  });
  const inquiryBody = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 5,
    sentenceMax: 10,
    wordMin: 5,
    wordMax: 10,
  });
  const inquiryPrivate = RandomGenerator.pick([true, false] as const);
  const inquiryStatus = "open";
  const inquiryCreate =
    await api.functional.shoppingMallAiBackend.customer.inquiries.create(
      connection,
      {
        body: {
          customer_id: customerId,
          seller_id: sellerId,
          product_id: null,
          order_id: null,
          title: inquiryTitle,
          body: inquiryBody,
          private: inquiryPrivate,
          status: inquiryStatus,
        } satisfies IShoppingMallAiBackendInquiry.ICreate,
      },
    );
  typia.assert(inquiryCreate);
  const inquiryId = inquiryCreate.id;

  // 4. Switch context to seller (login as seller, using known password assumption)
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: defaultSellerPassword,
    } satisfies IShoppingMallAiBackendSeller.ILogin,
  });

  // 5. As seller, create reply for the inquiry
  const replyBody = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 4,
    sentenceMax: 8,
    wordMin: 4,
    wordMax: 9,
  });
  const replyPrivate = RandomGenerator.pick([true, false] as const);
  const replyCreate =
    await api.functional.shoppingMallAiBackend.seller.inquiries.replies.create(
      connection,
      {
        inquiryId,
        body: {
          inquiry_id: inquiryId,
          parent_id: null,
          body: replyBody,
          private: replyPrivate,
        } satisfies IShoppingMallAiBackendInquiryReply.ICreate,
      },
    );
  typia.assert(replyCreate);
  const replyId = replyCreate.id;

  // 6. Fetch reply details as seller
  const reply =
    await api.functional.shoppingMallAiBackend.seller.inquiries.replies.at(
      connection,
      {
        inquiryId,
        replyId,
      },
    );
  typia.assert(reply);

  // 7. Assert all fields match expectations
  TestValidator.equals("reply.id matches", reply.id, replyId);
  TestValidator.equals("reply.inquiry_id matches", reply.inquiry_id, inquiryId);
  TestValidator.equals(
    "reply.author_type is seller",
    reply.author_type,
    "seller",
  );
  TestValidator.equals(
    "reply.seller_id matches joined seller",
    reply.seller_id,
    sellerId,
  );
  TestValidator.equals(
    "reply.customer_id is null for seller reply",
    reply.customer_id,
    null,
  );
  TestValidator.equals("reply.body matches", reply.body, replyBody);
  TestValidator.equals("reply.private matches", reply.private, replyPrivate);
  TestValidator.predicate(
    "reply.created_at is valid timestamp",
    typeof reply.created_at === "string" && !!Date.parse(reply.created_at),
  );
  TestValidator.predicate(
    "reply.updated_at is valid timestamp",
    typeof reply.updated_at === "string" && !!Date.parse(reply.updated_at),
  );
}
