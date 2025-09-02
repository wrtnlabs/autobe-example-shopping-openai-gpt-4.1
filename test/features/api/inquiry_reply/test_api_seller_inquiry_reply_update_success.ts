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
 * Validate that a seller can update their own reply to a customer inquiry
 * via the mall seller-inquiry reply update endpoint.
 *
 * This test exercises the core workflow and authorization for inquiry reply
 * ownership update, covers role switching between customer and seller, and
 * ensures only the reply's seller can update it.
 *
 * Steps:
 *
 * 1. Register (join) a customer
 * 2. Login as the customer
 * 3. Create an inquiry as the customer (targeting a product-less or general
 *    inquiry for the seller)
 * 4. Register (join) a seller
 * 5. Login as the seller
 * 6. Reply to the inquiry as the seller
 * 7. As the same seller, update the reply's body and private flag using the
 *    update endpoint
 * 8. Re-fetch the reply (re-update is not supported by the SDK, re-check via
 *    update response)
 * 9. Assert all updates: confirm body and 'private' flag changes, and that
 *    updated_at changed
 * 10. (Optional) Confirm that only this seller can update this reply by
 *     registering a second seller and attempting an update as them (should
 *     fail, but omit error path in this success-specific scenario)
 */
export async function test_api_seller_inquiry_reply_update_success(
  connection: api.IConnection,
) {
  // 1. Customer registration
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = "p@ssw0rd";
  const customerJoin = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      phone_number: RandomGenerator.mobile(),
      password: customerPassword,
      name: RandomGenerator.name(),
      nickname: RandomGenerator.name(1),
    } satisfies IShoppingMallAiBackendCustomer.IJoin,
  });
  typia.assert(customerJoin);
  const customer = customerJoin.customer;

  // 2. Login as customer (ensure session context)
  await api.functional.auth.customer.login(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
    } satisfies IShoppingMallAiBackendCustomer.ILogin,
  });

  // 3. Customer creates inquiry
  const inquiryCreate =
    await api.functional.shoppingMallAiBackend.customer.inquiries.create(
      connection,
      {
        body: {
          customer_id: customer.id,
          seller_id: null,
          product_id: null,
          order_id: null,
          title: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 2,
            wordMax: 8,
          }),
          body: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 10,
            sentenceMax: 20,
            wordMin: 3,
            wordMax: 10,
          }),
          private: false,
          status: "open",
        } satisfies IShoppingMallAiBackendInquiry.ICreate,
      },
    );
  typia.assert(inquiryCreate);
  const inquiryId = typia.assert(inquiryCreate.id);

  // 4. Register a seller
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = "sellp@ss";
  const sellerJoin = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      business_registration_number: RandomGenerator.alphaNumeric(10),
      name: RandomGenerator.name(),
    } satisfies IShoppingMallAiBackendSeller.ICreate,
  });
  typia.assert(sellerJoin);

  // 5. Login as seller
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
    } satisfies IShoppingMallAiBackendSeller.ILogin,
  });

  // 6. Seller replies to the inquiry
  const reply =
    await api.functional.shoppingMallAiBackend.seller.inquiries.replies.create(
      connection,
      {
        inquiryId: inquiryId,
        body: {
          inquiry_id: inquiryId,
          body: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 8,
            sentenceMax: 14,
            wordMin: 3,
            wordMax: 10,
          }),
          private: false,
        } satisfies IShoppingMallAiBackendInquiryReply.ICreate,
      },
    );
  typia.assert(reply);
  const replyId = typia.assert(reply.id);
  const replyOriginalUpdatedAt = reply.updated_at;

  // 7. Update the reply as the seller
  const updateInput: IShoppingMallAiBackendInquiryReply.IUpdate = {
    body: RandomGenerator.paragraph({ sentences: 4, wordMin: 5, wordMax: 10 }),
    private: true,
  };
  const updatedReply =
    await api.functional.shoppingMallAiBackend.seller.inquiries.replies.update(
      connection,
      {
        inquiryId: inquiryId,
        replyId: replyId,
        body: updateInput,
      },
    );
  typia.assert(updatedReply);

  // 8-9. Assert updates
  TestValidator.notEquals(
    "updated_at field has changed",
    updatedReply.updated_at,
    replyOriginalUpdatedAt,
  );
  if (updateInput.body !== undefined)
    TestValidator.equals(
      "body text is updated",
      updatedReply.body,
      updateInput.body,
    );
  if (updateInput.private !== undefined)
    TestValidator.equals(
      "private flag is updated",
      updatedReply.private,
      updateInput.private,
    );
  // Confirm reply is still owned by seller and links
  TestValidator.equals(
    "reply author_type remains seller",
    updatedReply.author_type,
    "seller",
  );
  TestValidator.equals(
    "reply's inquiry_id remains correct",
    updatedReply.inquiry_id,
    inquiryId,
  );
}
