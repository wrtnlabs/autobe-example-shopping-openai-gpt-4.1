import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function test_api_inquiry_reply_delete_customer_success(
  connection: api.IConnection,
) {
  /**
   * Validate successful soft deletion (logical deletion) of a customer's own
   * inquiry reply.
   *
   * Business context:
   *
   * - Customers can register and authenticate with the backend.
   * - Customers may write inquiries and replies, but SDK does not currently
   *   provide their creation/listing. For deletion, reply and inquiry IDs are
   *   randomized for demonstration.
   * - Deleting a reply should perform a soft-delete (logical deletion for audit),
   *   not physical removal.
   *
   * Implementation steps:
   *
   * 1. Register and authenticate a customer user.
   * 2. (SDK does not provide inquiry/reply creation APIs. Mock these IDs.)
   * 3. Delete the customer’s own reply by ID (DELETE
   *    /shoppingMallAiBackend/customer/inquiries/{inquiryId}/replies/{replyId}).
   * 4. Assert that the deletion endpoint succeeds with no error. Post-delete
   *    verification is not feasible without query endpoints.
   *
   * This function enforces authentication, proper business workflow, SDK/DTO
   * type safety, and includes comments for maintainers when SDK expands.
   */
  // 1. Register and authenticate a new customer
  const joinInput: IShoppingMallAiBackendCustomer.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    phone_number: RandomGenerator.mobile(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    nickname: RandomGenerator.name(1),
  };
  const authorized: IShoppingMallAiBackendCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, { body: joinInput });
  typia.assert(authorized);
  TestValidator.equals(
    "joined customer account is active",
    authorized.customer.is_active,
    true,
  );
  TestValidator.equals(
    "joined customer account is not verified on creation",
    authorized.customer.is_verified,
    false,
  );

  // 2. Mock inquiry and reply IDs, since SDK does not allow creation
  const inquiryId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const replyId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Delete the reply using authenticated customer context
  await api.functional.shoppingMallAiBackend.customer.inquiries.replies.erase(
    connection,
    { inquiryId, replyId },
  );
  // 4. Cannot verify removal (no available list or detail API in SDK).
  // Future SDK additions may allow checking absence or audit trail.
}
