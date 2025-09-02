import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendInquiry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendInquiry";

export async function test_api_customer_inquiry_delete_forbidden_other_user(
  connection: api.IConnection,
) {
  /**
   * Test forbids deleting an inquiry when requested by someone other than the
   * owner.
   *
   * Workflow:
   *
   * 1. Register Customer 1 and authenticate (sets connection token)
   * 2. Customer 1 creates an inquiry; the inquiryId is saved
   * 3. Register Customer 2 (switch session/auth context)
   * 4. Customer 2 attempts to delete Customer 1's inquiry
   * 5. Assert that forbidden/authorization error occurs, confirming only the owner
   *    can delete their own inquiry
   */

  // 1. Register Customer 1
  const customer1Email = typia.random<string & tags.Format<"email">>();
  const customer1 = await api.functional.auth.customer.join(connection, {
    body: {
      email: customer1Email,
      phone_number: RandomGenerator.mobile(),
      password: RandomGenerator.alphaNumeric(12),
      name: RandomGenerator.name(),
      nickname: RandomGenerator.name(1),
    } satisfies IShoppingMallAiBackendCustomer.IJoin,
  });
  typia.assert(customer1);

  // 2. Customer 1 creates an inquiry
  const inquiry =
    await api.functional.shoppingMallAiBackend.customer.inquiries.create(
      connection,
      {
        body: {
          customer_id: customer1.customer.id,
          seller_id: null,
          product_id: null,
          order_id: null,
          title: RandomGenerator.paragraph({ sentences: 4 }),
          body: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 4,
            sentenceMax: 8,
            wordMin: 4,
            wordMax: 10,
          }),
          private: true,
          status: "open",
        } satisfies IShoppingMallAiBackendInquiry.ICreate,
      },
    );
  typia.assert(inquiry);
  const inquiryId = inquiry.id;

  // 3. Register Customer 2 (session switches to new customer)
  const customer2Email = typia.random<string & tags.Format<"email">>();
  const customer2 = await api.functional.auth.customer.join(connection, {
    body: {
      email: customer2Email,
      phone_number: RandomGenerator.mobile(),
      password: RandomGenerator.alphaNumeric(12),
      name: RandomGenerator.name(),
      nickname: RandomGenerator.name(1),
    } satisfies IShoppingMallAiBackendCustomer.IJoin,
  });
  typia.assert(customer2);

  // 4. Attempt deletion as Customer 2: this must fail with forbidden/authorization error
  await TestValidator.error(
    "non-owner cannot delete another's inquiry",
    async () => {
      await api.functional.shoppingMallAiBackend.customer.inquiries.erase(
        connection,
        { inquiryId },
      );
    },
  );
}
