import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendInquiry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendInquiry";

export async function test_api_customer_inquiry_creation_success(
  connection: api.IConnection,
) {
  /**
   * Tests the business flow of a customer creating a new inquiry (QnA/support
   * ticket) with full persistence, audit, and ownership linkage.
   *
   * Steps:
   *
   * 1. Register a fresh customer using POST /auth/customer/join (sets proper
   *    authentication and customer context)
   * 2. Prepare a valid inquiry creation request (title, body, private flag,
   *    status) associated with this customer
   * 3. Call POST /shoppingMallAiBackend/customer/inquiries to create the inquiry
   * 4. Validate the response for required business and audit fields:
   *
   *    - Inquiry is persisted with unique id
   *    - Inquiry attributes (title, body, private, status) match input
   *    - Ownership: customer_id matches registered customer id
   *    - Audit fields (created_at, updated_at) are present and not null
   */

  // Step 1: Register and authenticate a fresh customer
  const joinInput: IShoppingMallAiBackendCustomer.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    phone_number: RandomGenerator.mobile(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    nickname: RandomGenerator.name(),
  };
  const customerAuth = await api.functional.auth.customer.join(connection, {
    body: joinInput,
  });
  typia.assert(customerAuth);
  const customerId = customerAuth.customer.id;

  // Step 2: Prepare inquiry creation request
  const inquiryInput: IShoppingMallAiBackendInquiry.ICreate = {
    customer_id: customerId,
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 12 }),
    body: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 3,
      wordMax: 8,
    }),
    private: true,
    status: "open",
  };

  // Step 3: Create the inquiry
  const inquiry =
    await api.functional.shoppingMallAiBackend.customer.inquiries.create(
      connection,
      {
        body: inquiryInput,
      },
    );
  typia.assert(inquiry);

  // Step 4: Validate response for all required business and audit fields
  TestValidator.predicate(
    "inquiry record has unique id",
    typeof inquiry.id === "string" && inquiry.id.length > 0,
  );
  TestValidator.equals(
    "inquiry title matches input",
    inquiry.title,
    inquiryInput.title,
  );
  TestValidator.equals(
    "inquiry body matches input",
    inquiry.body,
    inquiryInput.body,
  );
  TestValidator.equals(
    "inquiry privacy flag matches input",
    inquiry.private,
    inquiryInput.private,
  );
  TestValidator.equals(
    "inquiry status matches input",
    inquiry.status,
    inquiryInput.status,
  );
  TestValidator.equals(
    "inquiry owner is registered customer",
    inquiry.customer_id,
    customerId,
  );
  TestValidator.predicate(
    "audit field created_at present and not null",
    typeof inquiry.created_at === "string" && inquiry.created_at.length > 0,
  );
  TestValidator.predicate(
    "audit field updated_at present and not null",
    typeof inquiry.updated_at === "string" && inquiry.updated_at.length > 0,
  );
}
