import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Test logical deletion request for a non-existent inquiry owned by the
 * customer.
 *
 * Purpose: Ensure that DELETE requests on non-existent (or already deleted)
 * inquiries return an appropriate error and do not succeed. This validates
 * that the system does not silently ignore or improperly handle orphan
 * delete attempts, protecting resource consistency and user feedback.
 *
 * Steps:
 *
 * 1. Register a new customer account for authentication (simulates onboarding
 *    scenario).
 * 2. Attempt to delete a never-existing inquiry using a random UUID as
 *    inquiryId.
 * 3. Validate that an error is correctly thrown, indicating no such inquiry
 *    exists for deletion.
 *
 * Notes:
 *
 * - Only business-logic (not TypeScript type) errors are being tested—this
 *   does not simulate type validation errors.
 * - Proper type-safe DTOs and API flows are used.
 * - The error message is not checked for content; only that an error is
 *   correctly thrown on delete.
 */
export async function test_api_customer_inquiry_delete_not_found(
  connection: api.IConnection,
) {
  // 1. Register a new customer for authentication context
  const joinInput: IShoppingMallAiBackendCustomer.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    phone_number: RandomGenerator.mobile(),
    password: RandomGenerator.alphaNumeric(15),
    name: RandomGenerator.name(),
    nickname: RandomGenerator.name(),
  };
  const authorized = await api.functional.auth.customer.join(connection, {
    body: joinInput,
  });
  typia.assert(authorized);

  // 2. Attempt to delete an inquiryId that does not exist (guaranteed random UUID)
  const nonExistentInquiryId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "deleting a non-existent inquiry returns an error",
    async () => {
      await api.functional.shoppingMallAiBackend.customer.inquiries.erase(
        connection,
        {
          inquiryId: nonExistentInquiryId,
        },
      );
    },
  );
}
