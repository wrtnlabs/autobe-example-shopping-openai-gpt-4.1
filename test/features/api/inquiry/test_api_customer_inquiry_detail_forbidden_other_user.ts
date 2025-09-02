import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendInquiry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendInquiry";

export async function test_api_customer_inquiry_detail_forbidden_other_user(
  connection: api.IConnection,
) {
  /**
   * Validate that a customer cannot access another customer's private inquiry
   * details.
   *
   * Steps:
   *
   * 1. Register first customer and retain their authentication token.
   * 2. First customer creates a private inquiry and the inquiryId is saved.
   * 3. Register (and switch session to) a second distinct customer.
   * 4. Attempt to access the first customer's inquiry detail using the second
   *    customer's context.
   * 5. Assert that access is forbidden and an error is thrown.
   */

  // 1. Register the first customer and retain authentication
  const customer1Email = typia.random<string & tags.Format<"email">>();
  const customer1: IShoppingMallAiBackendCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customer1Email,
        phone_number: RandomGenerator.mobile(),
        password: "TestPassword123!",
        name: RandomGenerator.name(),
        nickname: RandomGenerator.name(1),
      } satisfies IShoppingMallAiBackendCustomer.IJoin,
    });
  typia.assert(customer1);

  // 2. First customer creates a private inquiry
  const inquiry: IShoppingMallAiBackendInquiry =
    await api.functional.shoppingMallAiBackend.customer.inquiries.create(
      connection,
      {
        body: {
          // customer_id is omitted (token-based authentication assigns ownership)
          title: RandomGenerator.paragraph({ sentences: 3 }),
          body: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 4,
            sentenceMax: 8,
          }),
          private: true,
          status: "open",
        } satisfies IShoppingMallAiBackendInquiry.ICreate,
      },
    );
  typia.assert(inquiry);
  const inquiryId: string & tags.Format<"uuid"> = inquiry.id;

  // 3. Register a second, distinct customer (switch authentication context)
  const customer2Email = typia.random<string & tags.Format<"email">>();
  const customer2: IShoppingMallAiBackendCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customer2Email,
        phone_number: RandomGenerator.mobile(),
        password: "TestPassword123!",
        name: RandomGenerator.name(),
        nickname: RandomGenerator.name(1),
      } satisfies IShoppingMallAiBackendCustomer.IJoin,
    });
  typia.assert(customer2);

  // 4. Attempt by second customer to access the private inquiry detail
  await TestValidator.error(
    "other customer forbidden from accessing non-owned inquiry",
    async () => {
      await api.functional.shoppingMallAiBackend.customer.inquiries.at(
        connection,
        {
          inquiryId: inquiryId,
        },
      );
    },
  );
}
