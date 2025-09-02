import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendSeller";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Test successful logical deletion (soft delete) of a seller's reply on an
 * inquiry.
 *
 * 1. Register a new seller via seller join endpoint, obtaining authentication
 *    and seller profile.
 * 2. (Mock) Create an inquiry and author a reply - since no endpoints are
 *    provided, generate random UUIDs for inquiryId and replyId.
 * 3. Call the delete (soft-delete) endpoint as the authenticated seller,
 *    passing both IDs.
 * 4. Verify no error is thrown and the request is accepted (void response is
 *    enough for technical success).
 * 5. (Business) In a real suite, would assert that reply is omitted from
 *    normal query results, and that deleted_at is set for audit; comment
 *    that this is a limitation due to missing read/list endpoints for
 *    replies.
 */
export async function test_api_inquiry_reply_delete_seller_success(
  connection: api.IConnection,
) {
  // 1. Register a seller and authenticate
  const sellerRegistration = await api.functional.auth.seller.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      business_registration_number: RandomGenerator.alphaNumeric(10),
      name: RandomGenerator.name(),
    } satisfies IShoppingMallAiBackendSeller.ICreate,
  });
  typia.assert(sellerRegistration);
  TestValidator.equals(
    "registered seller is active",
    sellerRegistration.seller.is_active,
    true,
  );

  // 2. (Mock) Prepare random UUIDs for inquiry and reply (cannot create via API)
  const inquiryId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const replyId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Issue logical delete (soft delete) call as authenticated seller
  await api.functional.shoppingMallAiBackend.seller.inquiries.replies.erase(
    connection,
    {
      inquiryId,
      replyId,
    },
  );

  // 4. (Success) Expect no error. No further assertion possible as response is void.
  // 5. (Business/exploratory) In complete API: would now verify reply is omitted from normal queries and present in audit with deleted_at set.
}
