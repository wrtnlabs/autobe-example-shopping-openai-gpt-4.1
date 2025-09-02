import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendInquiry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendInquiry";

/**
 * Validate that a customer can retrieve their own inquiry details
 * successfully, including full audit info.
 *
 * This test ensures:
 *
 * - Customer registration is completed and session is established.
 * - Customer creates a new inquiry, receives inquiryId.
 * - Customer can call GET
 *   /shoppingMallAiBackend/customer/inquiries/{inquiryId} with their own
 *   inquiryId and receive a response with all required fields.
 * - Response includes owner UUID, the same title/body/private/status values,
 *   and all audit fields (created_at, etc.).
 *
 * Steps:
 *
 * 1. Register a new customer (saving customer fields)
 * 2. Create a new inquiry using this customer's context, saving all input data
 * 3. Retrieve the inquiry by its id
 * 4. Assert that all details match: customer_id, title, body, status, private,
 *    audit fields populated.
 */
export async function test_api_customer_inquiry_detail_success_by_owner(
  connection: api.IConnection,
) {
  // 1. Register new customer
  const customerInput: IShoppingMallAiBackendCustomer.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    phone_number: RandomGenerator.mobile(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    nickname: RandomGenerator.name(),
  };
  const auth: IShoppingMallAiBackendCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerInput,
    });
  typia.assert(auth);
  const customer = auth.customer;
  // 2. Create an inquiry as the customer
  const inquiryInput: IShoppingMallAiBackendInquiry.ICreate = {
    customer_id: customer.id,
    seller_id: null,
    product_id: null,
    order_id: null,
    title: RandomGenerator.paragraph({ sentences: 4, wordMin: 3, wordMax: 8 }),
    body: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 6,
      sentenceMax: 10,
      wordMin: 4,
      wordMax: 9,
    }),
    private: true,
    status: "open",
  };
  const inquiry =
    await api.functional.shoppingMallAiBackend.customer.inquiries.create(
      connection,
      {
        body: inquiryInput,
      },
    );
  typia.assert(inquiry);
  // 3. Retrieve inquiry details as the same customer
  const detail =
    await api.functional.shoppingMallAiBackend.customer.inquiries.at(
      connection,
      {
        inquiryId: inquiry.id,
      },
    );
  typia.assert(detail);
  // 4. Assert owner is correct and all details match
  TestValidator.equals(
    "inquiry customer_id matches owner",
    detail.customer_id,
    customer.id,
  );
  TestValidator.equals(
    "inquiry title matches input",
    detail.title,
    inquiryInput.title,
  );
  TestValidator.equals(
    "inquiry body matches input",
    detail.body,
    inquiryInput.body,
  );
  TestValidator.equals(
    "inquiry private status matches input",
    detail.private,
    inquiryInput.private,
  );
  TestValidator.equals(
    "inquiry status matches input",
    detail.status,
    inquiryInput.status,
  );
  TestValidator.predicate(
    "created_at is populated",
    typeof detail.created_at === "string" && detail.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is populated",
    typeof detail.updated_at === "string" && detail.updated_at.length > 0,
  );
  TestValidator.equals(
    "deleted_at should be null or undefined",
    detail.deleted_at,
    null,
  );
  TestValidator.equals(
    "closed_at should be null or undefined",
    detail.closed_at,
    null,
  );
}
