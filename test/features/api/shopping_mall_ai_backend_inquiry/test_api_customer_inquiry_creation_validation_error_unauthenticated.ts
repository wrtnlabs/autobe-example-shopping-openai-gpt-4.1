import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendInquiry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendInquiry";

export async function test_api_customer_inquiry_creation_validation_error_unauthenticated(
  connection: api.IConnection,
) {
  /**
   * Validate inquiry creation requires authentication (unauthenticated case).
   *
   * - Attempt to create a customer inquiry without any prior authentication.
   * - Assert that the API rejects the request with an authentication error (not
   *   authorized).
   * - Validate error is thrown specifically for unauthenticated access scenario.
   * - Does NOT attempt successful inquiry creation (as that is covered in other
   *   tests).
   *
   * Steps:
   *
   * 1. Construct a valid inquiry creation payload (randomized, but valid fields).
   * 2. Remove all authentication headers from the connection (simulate
   *    unauthenticated session).
   * 3. Attempt to call the inquiry creation endpoint with the unauthenticated
   *    connection and payload.
   * 4. Assert that an error is thrown due to lack of authentication.
   */
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  const inquiryPayload = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 12 }),
    body: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 8,
      sentenceMax: 15,
      wordMin: 3,
      wordMax: 7,
    }),
    private: RandomGenerator.pick([true, false] as const),
    status: "open",
  } satisfies IShoppingMallAiBackendInquiry.ICreate;
  await TestValidator.error(
    "creating inquiry without authentication should be rejected",
    async () => {
      await api.functional.shoppingMallAiBackend.customer.inquiries.create(
        unauthenticatedConnection,
        { body: inquiryPayload },
      );
    },
  );
}
