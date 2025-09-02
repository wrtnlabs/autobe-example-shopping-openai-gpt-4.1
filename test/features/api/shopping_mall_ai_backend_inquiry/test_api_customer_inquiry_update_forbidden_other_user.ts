import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendInquiry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendInquiry";

export async function test_api_customer_inquiry_update_forbidden_other_user(
  connection: api.IConnection,
) {
  /**
   * Test update failure for unauthorized inquiry edit by another customer.
   *
   * This test ensures that only the owner of an inquiry (Customer A) can update
   * it, and that attempts by another customer (Customer B) to modify the
   * inquiry are forbidden.
   *
   * 1. Register Customer A (inquiry owner)
   * 2. Register Customer B (unauthorized updater)
   * 3. Customer A creates an inquiry
   * 4. Switch context to Customer B
   * 5. Attempt to update Customer A's inquiry as Customer B (should fail)
   * 6. Validate that the update is forbidden (authorization failure)
   */

  // 1. Register Customer A
  const customerAEmail = typia.random<string & tags.Format<"email">>();
  const customerA: IShoppingMallAiBackendCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerAEmail,
        phone_number: RandomGenerator.mobile(),
        password: RandomGenerator.alphaNumeric(12),
        name: RandomGenerator.name(),
        nickname: RandomGenerator.name(1),
      } satisfies IShoppingMallAiBackendCustomer.IJoin,
    });
  typia.assert(customerA);

  // 2. Register Customer B
  const customerBEmail = typia.random<string & tags.Format<"email">>();
  const customerB: IShoppingMallAiBackendCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerBEmail,
        phone_number: RandomGenerator.mobile(),
        password: RandomGenerator.alphaNumeric(12),
        name: RandomGenerator.name(),
        nickname: RandomGenerator.name(1),
      } satisfies IShoppingMallAiBackendCustomer.IJoin,
    });
  typia.assert(customerB);

  // 3. Customer A is already authenticated from join - context is Customer B after their join
  // Customer A creates an inquiry
  // (The join for Customer B overwrites connection.headers.Authorization, but inquiry creation must be by Customer A)
  // To ensure correct context, login as Customer A before inquiry creation
  await api.functional.auth.customer.join(connection, {
    body: {
      email: customerAEmail,
      phone_number: RandomGenerator.mobile(),
      password: RandomGenerator.alphaNumeric(12),
      name: RandomGenerator.name(),
      nickname: RandomGenerator.name(1),
    } satisfies IShoppingMallAiBackendCustomer.IJoin,
  });

  const inquiry: IShoppingMallAiBackendInquiry =
    await api.functional.shoppingMallAiBackend.customer.inquiries.create(
      connection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 3 }),
          body: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 5,
            sentenceMax: 8,
          }),
          private: false,
          status: "open",
        } satisfies IShoppingMallAiBackendInquiry.ICreate,
      },
    );
  typia.assert(inquiry);

  // 4. Switch to Customer B by joining/logging in as Customer B
  await api.functional.auth.customer.join(connection, {
    body: {
      email: customerBEmail,
      phone_number: RandomGenerator.mobile(),
      password: RandomGenerator.alphaNumeric(12),
      name: RandomGenerator.name(),
      nickname: RandomGenerator.name(1),
    } satisfies IShoppingMallAiBackendCustomer.IJoin,
  });

  // 5. Attempt to update Customer A's inquiry as Customer B - expect failure
  await TestValidator.error(
    "forbids updating another user's inquiry",
    async () => {
      await api.functional.shoppingMallAiBackend.customer.inquiries.update(
        connection,
        {
          inquiryId: inquiry.id,
          body: {
            title: RandomGenerator.paragraph({ sentences: 2 }),
            body: RandomGenerator.content({
              paragraphs: 1,
              sentenceMin: 3,
              sentenceMax: 5,
            }),
            private: true,
            status: "closed",
          } satisfies IShoppingMallAiBackendInquiry.IUpdate,
        },
      );
    },
  );
}
