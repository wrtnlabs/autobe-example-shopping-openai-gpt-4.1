import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendSeller";
import type { IShoppingMallAiBackendInquiry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendInquiry";
import type { IShoppingMallAiBackendInquiryReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendInquiryReply";

export async function test_api_inquiry_reply_create_by_seller_to_customer_inquiry(
  connection: api.IConnection,
) {
  /**
   * E2E test: Seller replies to a customer-generated inquiry.
   *
   * 1. Register a customer and a seller account
   * 2. Customer logs in to establish session context
   * 3. Customer creates an inquiry thread
   * 4. Seller logs in to switch to seller role
   * 5. Seller posts a reply to the customer's inquiry
   * 6. Validate that the reply records correct inquiry linkage, author_type,
   *    seller info, privacy, content, and audit fields
   */

  // Step 1: Register customer
  const customerPassword = RandomGenerator.alphaNumeric(12);
  const customerJoinInput: IShoppingMallAiBackendCustomer.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    phone_number: RandomGenerator.mobile(),
    password: customerPassword,
    name: RandomGenerator.name(),
    nickname: RandomGenerator.name(1),
  };
  const customerAuth = await api.functional.auth.customer.join(connection, {
    body: customerJoinInput,
  });
  typia.assert(customerAuth);
  const customer = customerAuth.customer;

  // Step 2: Register seller, also assign test password for login
  const sellerPassword = RandomGenerator.alphaNumeric(12);
  // We will assume seller login process (even if ICreate lacks password) for E2E, so use same password for login below
  const sellerJoinInput: IShoppingMallAiBackendSeller.ICreate = {
    email: typia.random<string & tags.Format<"email">>(),
    business_registration_number: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
  };
  const sellerAuth = await api.functional.auth.seller.join(connection, {
    body: sellerJoinInput,
  });
  typia.assert(sellerAuth);
  const seller = sellerAuth.seller;

  // Step 3: Login as customer
  await api.functional.auth.customer.login(connection, {
    body: {
      email: customerJoinInput.email,
      password: customerPassword,
    },
  });

  // Step 4: Customer creates an inquiry
  const inquiryCreateInput: IShoppingMallAiBackendInquiry.ICreate = {
    customer_id: customer.id,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    private: RandomGenerator.pick([true, false] as const),
    status: "open",
  };
  const inquiry =
    await api.functional.shoppingMallAiBackend.customer.inquiries.create(
      connection,
      { body: inquiryCreateInput },
    );
  typia.assert(inquiry);

  // Step 5: Login as seller (context switch)
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerJoinInput.email,
      password: sellerPassword, // Although not present in ICreate, needed for login API (see docs).
    },
  });

  // Step 6: Seller replies to inquiry
  const replyBody = RandomGenerator.content({ paragraphs: 1 });
  const replyPrivate = RandomGenerator.pick([true, false] as const);
  const replyInput: IShoppingMallAiBackendInquiryReply.ICreate = {
    inquiry_id: inquiry.id,
    body: replyBody,
    private: replyPrivate,
  };
  const reply =
    await api.functional.shoppingMallAiBackend.seller.inquiries.replies.create(
      connection,
      {
        inquiryId: inquiry.id,
        body: replyInput,
      },
    );
  typia.assert(reply);

  // Validation: linkage fields and content/audit integrity
  TestValidator.equals(
    "reply inquiry_id matches",
    reply.inquiry_id,
    inquiry.id,
  );
  TestValidator.equals("author_type is 'seller'", reply.author_type, "seller");
  TestValidator.equals("reply seller_id matches", reply.seller_id, seller.id);
  TestValidator.equals(
    "no customer_id in seller reply",
    reply.customer_id,
    null,
  );
  TestValidator.equals("reply body matches input", reply.body, replyBody);
  TestValidator.equals(
    "reply privacy matches input",
    reply.private,
    replyPrivate,
  );
  TestValidator.predicate(
    "reply created_at is a valid ISO date",
    typeof reply.created_at === "string" &&
      !isNaN(Date.parse(reply.created_at)),
  );
  TestValidator.predicate(
    "reply updated_at is a valid ISO date",
    typeof reply.updated_at === "string" &&
      !isNaN(Date.parse(reply.updated_at)),
  );
}
