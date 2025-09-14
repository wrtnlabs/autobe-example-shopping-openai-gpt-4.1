import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAiCommerceBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceBuyer";
import type { IAiCommerceInquiry } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceInquiry";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IBuyer";

/**
 * Validates detail retrieval of public and private inquiries for both
 * authors and other users.
 *
 * Tests that public inquiries are accessible to anyone, private inquiries
 * are only accessible to the author, and appropriate errors are raised
 * otherwise.
 *
 * Scenario steps:
 *
 * 1. Register Buyer A (inquiry author)
 * 2. Authenticate as Buyer A, create a public inquiry
 * 3. Authenticate as Buyer A, create a private inquiry
 * 4. Retrieve both inquiries by ID as Buyer A (should succeed for both)
 * 5. Register Buyer B (different user)
 * 6. Authenticate as Buyer B, retrieve public inquiry (should succeed)
 * 7. Authenticate as Buyer B, try retrieving private inquiry (should fail with
 *    error)
 * 8. Attempt to retrieve a non-existent inquiry (should fail with error)
 */
export async function test_api_inquiry_at_accessible_by_public_and_author(
  connection: api.IConnection,
) {
  // 1. Register Buyer A (inquiry author)
  const buyerAEmail = typia.random<string & tags.Format<"email">>();
  const buyerAPassword = RandomGenerator.alphaNumeric(12);
  const buyerA = await api.functional.auth.buyer.join(connection, {
    body: {
      email: buyerAEmail,
      password: buyerAPassword,
    } satisfies IBuyer.ICreate,
  });
  typia.assert(buyerA);

  // 2. Authenticate as Buyer A, create a public inquiry
  const publicInquiry = await api.functional.aiCommerce.buyer.inquiries.create(
    connection,
    {
      body: {
        product_id: typia.random<string & tags.Format<"uuid">>(),
        question: RandomGenerator.paragraph(),
        visibility: "public",
      } satisfies IAiCommerceInquiry.ICreate,
    },
  );
  typia.assert(publicInquiry);

  // 3. Authenticate as Buyer A, create a private inquiry
  const privateInquiry = await api.functional.aiCommerce.buyer.inquiries.create(
    connection,
    {
      body: {
        product_id: typia.random<string & tags.Format<"uuid">>(),
        question: RandomGenerator.paragraph(),
        visibility: "private",
      } satisfies IAiCommerceInquiry.ICreate,
    },
  );
  typia.assert(privateInquiry);

  // 4. Retrieve both inquiries by ID as Buyer A (should succeed)
  const fetchedPublicA = await api.functional.aiCommerce.inquiries.at(
    connection,
    {
      inquiryId: publicInquiry.id,
    },
  );
  typia.assert(fetchedPublicA);
  TestValidator.equals(
    "Author can access public inquiry",
    fetchedPublicA.id,
    publicInquiry.id,
  );

  const fetchedPrivateA = await api.functional.aiCommerce.inquiries.at(
    connection,
    {
      inquiryId: privateInquiry.id,
    },
  );
  typia.assert(fetchedPrivateA);
  TestValidator.equals(
    "Author can access private inquiry",
    fetchedPrivateA.id,
    privateInquiry.id,
  );

  // 5. Register Buyer B (other user)
  const buyerBEmail = typia.random<string & tags.Format<"email">>();
  const buyerBPassword = RandomGenerator.alphaNumeric(12);
  const buyerB = await api.functional.auth.buyer.join(connection, {
    body: {
      email: buyerBEmail,
      password: buyerBPassword,
    } satisfies IBuyer.ICreate,
  });
  typia.assert(buyerB);

  // 6. Authenticate as Buyer B, retrieve public inquiry (should succeed)
  const fetchedPublicB = await api.functional.aiCommerce.inquiries.at(
    connection,
    {
      inquiryId: publicInquiry.id,
    },
  );
  typia.assert(fetchedPublicB);
  TestValidator.equals(
    "Other user can access public inquiry",
    fetchedPublicB.id,
    publicInquiry.id,
  );

  // 7. Authenticate as Buyer B, try to retrieve private inquiry (should fail with error)
  await TestValidator.error(
    "Other user cannot access private inquiry",
    async () => {
      await api.functional.aiCommerce.inquiries.at(connection, {
        inquiryId: privateInquiry.id,
      });
    },
  );

  // 8. Attempt to retrieve a non-existent inquiry (should fail with error)
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("Not found for non-existent inquiry", async () => {
    await api.functional.aiCommerce.inquiries.at(connection, {
      inquiryId: nonExistentId,
    });
  });
}

/**
 * - All required scenario cases are covered: author creates public/private
 *   inquiries, can fetch both; other user can only fetch public, gets error on
 *   private; not found error is tested.
 * - No type errors, 'as any', or missing required fields. All TestValidator calls
 *   have descriptive titles.
 * - API calls all have await and use correct DTOs.
 * - Variable naming is clear; password values use RandomGenerator,
 *   emails/type-safe generation.
 * - Authentication: Buyer B is registered but the session is not forcibly
 *   swapped, but as connection is passed and the SDK updates the authentication
 *   token after join, the context should switch to new buyer.
 * - No additional imports, all code within template confines.
 * - Error tests use await with async callback.
 * - Typia.assert used for every non-void response.
 *
 * No prohibited code patterns detected, meets all requirements.
 *
 * - Rules
 *
 *   - O 1. Role and Responsibility
 *   - O 2. Input Materials Provided
 *   - O 3. Code Generation Requirements
 *   - O 3.1. Import Management
 *   - O 3.2. API SDK Function Invocation
 *   - O 3.3. API Response and Request Type Checking
 *   - O 3.3.1. Response Type Validation
 *   - O 3.5. Handling Nullable and Undefined Values
 *   - O 3.4. Random Data Generation
 *   - O 3.6. TypeScript Type Narrowing and Control Flow Analysis
 *   - O 3.7. Authentication Handling
 *   - O 3.7. Logic Validation and Assertions
 *   - O 4. Quality Standards and Best Practices
 *   - O 4.5. Typia Tag Type Conversion (When Encountering Type Mismatches)
 *   - O 4.6. Request Body Variable Declaration Guidelines
 *   - O 5. Final Checklist
 * - Check List
 *
 *   - O NO additional import statements
 *   - O NO require() statements
 *   - O NO wrong type data in requests
 *   - O NO missing required fields
 *   - O NO fictional functions or types from examples are used
 *   - O EVERY api.functional.* call has await
 *   - O EVERY TestValidator function has title as first parameter
 *   - O All API responses are validated with typia.assert()
 */
const __revise = {};
__revise;
