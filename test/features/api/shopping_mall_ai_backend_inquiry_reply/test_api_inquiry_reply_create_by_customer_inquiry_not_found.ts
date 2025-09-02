import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendInquiryReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendInquiryReply";

/**
 * Validate the error scenario for replying to a non-existent inquiry by a
 * customer.
 *
 * This test ensures that the system correctly handles the case where an
 * authenticated customer attempts to create a reply for an inquiry that
 * does not exist.
 *
 * Workflow:
 *
 * 1. Register a new customer via /auth/customer/join and confirm
 *    authentication.
 * 2. Attempt to post a reply via
 *    /shoppingMallAiBackend/customer/inquiries/{inquiryId}/replies with a
 *    non-existent, randomly generated inquiryId.
 * 3. Provide a type-safe and fully valid request body.
 * 4. Assert the API responds with an error, confirming appropriate handling of
 *    missing resource (inquiry not found).
 * 5. Ensure the error path does not overlap with input validation (inputs are
 *    correct, only inquiryId is invalid).
 * 6. No cross-role or unauthorized session actions are performed.
 */
export async function test_api_inquiry_reply_create_by_customer_inquiry_not_found(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new customer
  const email: string = typia.random<string & tags.Format<"email">>();
  const phone_number: string = RandomGenerator.mobile();
  const password: string = RandomGenerator.alphaNumeric(12);
  const name: string = RandomGenerator.name();
  const nickname: string = RandomGenerator.name();

  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email,
      phone_number,
      password,
      name,
      nickname,
    } satisfies IShoppingMallAiBackendCustomer.IJoin,
  });
  typia.assert(customer);

  // 2. Attempt to create a reply for a non-existent inquiry
  const nonExistentInquiryId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const replyBody = {
    inquiry_id: nonExistentInquiryId,
    body: RandomGenerator.paragraph({ sentences: 3 }),
    private: false,
    parent_id: undefined, // Explicitly undefined for clarity
  } satisfies IShoppingMallAiBackendInquiryReply.ICreate;

  // 3. Expect an error when posting the reply
  await TestValidator.error(
    "should fail when replying to non-existent inquiry",
    async () => {
      await api.functional.shoppingMallAiBackend.customer.inquiries.replies.create(
        connection,
        {
          inquiryId: nonExistentInquiryId,
          body: replyBody,
        },
      );
    },
  );
}
