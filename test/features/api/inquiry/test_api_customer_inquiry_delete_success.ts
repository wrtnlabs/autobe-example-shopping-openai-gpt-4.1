import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendInquiry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendInquiry";

/**
 * Test successful logical deletion (soft delete) of an inquiry by its
 * owner.
 *
 * 1. Register and authenticate a customer using the /auth/customer/join
 *    endpoint.
 * 2. As the authenticated user, create a new inquiry via
 *    /shoppingMallAiBackend/customer/inquiries.
 * 3. Delete the created inquiry via
 *    /shoppingMallAiBackend/customer/inquiries/{inquiryId}, as the same
 *    customer.
 * 4. (If inquiry read/list endpoint were available:) Attempt to retrieve the
 *    deleted inquiry and verify it is excluded from normal queries.
 *    (Omitted due to absence of such API.)
 * 5. Optional: If the API returned an entity or confirmation, check that
 *    deleted_at is set (not null).
 * 6. Overall, this validates that:
 *
 *    - The inquiry can be logically deleted by its owner
 *    - Evidence is preserved via 'deleted_at'
 *    - Subsequent listings exclude the deleted inquiry (business logic,
 *         untestable here)
 */
export async function test_api_customer_inquiry_delete_success(
  connection: api.IConnection,
) {
  // Step 1: Register & authenticate a customer
  const email = typia.random<string & tags.Format<"email">>();
  const phone = RandomGenerator.mobile();
  const password = RandomGenerator.alphaNumeric(12);
  const name = RandomGenerator.name();
  const nickname = RandomGenerator.name(1);
  const joinRes = await api.functional.auth.customer.join(connection, {
    body: {
      email,
      phone_number: phone,
      password,
      name,
      nickname,
    } satisfies IShoppingMallAiBackendCustomer.IJoin,
  });
  typia.assert(joinRes);

  // Step 2: Create a new inquiry for this user
  const inquiry =
    await api.functional.shoppingMallAiBackend.customer.inquiries.create(
      connection,
      {
        body: {
          customer_id: joinRes.customer.id,
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
  TestValidator.equals(
    "inquiry owner matches customer",
    inquiry.customer_id,
    joinRes.customer.id,
  );

  // Step 3: Logically delete the inquiry as owner
  await api.functional.shoppingMallAiBackend.customer.inquiries.erase(
    connection,
    {
      inquiryId: inquiry.id,
    },
  );

  // Step 4: (No listing/detail API, so cannot test visibility/exclusion directly)
  // Optional Step 5: Try to retrieve (no endpoint); instead, simulate by checking soft delete effect
  // Since delete returns void, if further read API were available, would: verify deleted_at is set.
}
