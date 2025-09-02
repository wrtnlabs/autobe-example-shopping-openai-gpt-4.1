import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendSeller";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function test_api_seller_join_invalid_data_failure(
  connection: api.IConnection,
) {
  /**
   * E2E test to verify server-side validation during seller registration with
   * invalid or missing data.
   *
   * Validates three major cases:
   *
   * 1. Missing required fields (email, business_registration_number, name)
   *    individually
   * 2. Invalid email format (not a valid email address string)
   * 3. Required fields provided as empty strings
   *
   * For each case, the API should reject the registration attempt and never
   * issue tokens or create a seller account. The test ensures the connection's
   * Authorization header remains unset on error.
   */

  // Valid seller data template
  const validSeller = {
    email: "valid-seller@example.com",
    business_registration_number: "123-45-67890",
    name: "Valid Seller Co.",
  } satisfies IShoppingMallAiBackendSeller.ICreate;

  // 1. Omit each required field one at a time to test missing field validation
  const requiredFields = [
    "email",
    "business_registration_number",
    "name",
  ] as const;
  for (const field of requiredFields) {
    // clone base object and delete the field (TypeScript requires as any for the test)
    const incompleteInput = { ...validSeller } as Record<string, any>;
    delete incompleteInput[field];
    await TestValidator.error(
      `should fail when missing required field '${field}'`,
      async () => {
        await api.functional.auth.seller.join(connection, {
          body: incompleteInput as any,
        });
      },
    );
    // Authorization header should not be set after failure
    TestValidator.equals(
      `authorization header must not be set after missing '${field}'`,
      connection.headers?.Authorization,
      undefined,
    );
  }

  // 2. Invalid email format
  await TestValidator.error(
    "should fail with invalid email format",
    async () => {
      await api.functional.auth.seller.join(connection, {
        body: {
          email: "not-an-email",
          business_registration_number:
            validSeller.business_registration_number,
          name: validSeller.name,
        } satisfies IShoppingMallAiBackendSeller.ICreate,
      });
    },
  );
  TestValidator.equals(
    "authorization header must not be set after invalid email format",
    connection.headers?.Authorization,
    undefined,
  );

  // 3. All required fields provided as empty strings
  await TestValidator.error(
    "should fail when all required fields are empty strings",
    async () => {
      await api.functional.auth.seller.join(connection, {
        body: {
          email: "",
          business_registration_number: "",
          name: "",
        } satisfies IShoppingMallAiBackendSeller.ICreate,
      });
    },
  );
  TestValidator.equals(
    "authorization header must not be set after empty string fields",
    connection.headers?.Authorization,
    undefined,
  );
}
