import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendSeller";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Test: Unauthorized reply deletion attempt by non-author seller
 *
 * Business context: To maintain integrity in business communication, only
 * the seller who authored a reply to an inquiry may delete it. System must
 * prevent deletion attempts by other sellers, regardless of
 * authentication.
 *
 * Steps:
 *
 * 1. Register the first seller (reply author)
 * 2. Register the second seller (attempted unauthorized deleter)
 * 3. Using random UUIDs, simulate an inquiry and its reply authored by the
 *    first seller (no API to create these)
 * 4. Switch authentication to the second seller
 * 5. Attempt to delete the reply using the second seller's credential
 * 6. Assert that the operation fails due to permission error, confirming
 *    role-based and author-based access control.
 */
export async function test_api_inquiry_reply_delete_seller_not_owner_failure(
  connection: api.IConnection,
) {
  // 1. Register first seller (reply author)
  const firstSeller = await api.functional.auth.seller.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      business_registration_number: RandomGenerator.alphaNumeric(10),
      name: RandomGenerator.name(),
    },
  });
  typia.assert(firstSeller);

  // 2. Register second seller (who will attempt unauthorized delete)
  const secondSeller = await api.functional.auth.seller.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      business_registration_number: RandomGenerator.alphaNumeric(10),
      name: RandomGenerator.name(),
    },
  });
  typia.assert(secondSeller);

  // 3. Simulate an inquiry ID and reply ID (since there is no create API available)
  const inquiryId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const replyId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 4. Switch to second seller context (token is set automatically by 'join')

  // 5. Attempt unauthorized deletion of reply (expect permission error)
  await TestValidator.error(
    "Seller who is not author cannot delete other's reply",
    async () => {
      await api.functional.shoppingMallAiBackend.seller.inquiries.replies.erase(
        connection,
        {
          inquiryId,
          replyId,
        },
      );
    },
  );
}
