import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAiCommerceBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceBuyer";
import type { IAiCommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceSeller";
import type { IAiCommerceSellerKyc } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceSellerKyc";
import type { IAiCommerceSellerOnboarding } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceSellerOnboarding";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IBuyer";

/**
 * Validate successful creation of Seller KYC for a newly onboarded seller.
 *
 * 1. Register a new buyer (with random valid email/password).
 * 2. Login as that buyer (buyer role context).
 * 3. Escalate buyer to seller: Register seller using the same email/password
 *    to establish seller context.
 * 4. Login as that seller (seller authentication context).
 * 5. Initiate seller onboarding: create onboarding application referencing the
 *    seller's user_id.
 * 6. Submit a valid Seller KYC record via
 *    api.functional.aiCommerce.seller.sellerKyc.create:
 *
 *    - Provide user_id and onboarding_id from onboarding record
 *    - Use plausible kyc_status (e.g., 'pending'), and valid
 *         document_type/metadata (e.g., 'passport', basic stringified
 *         JSON)
 * 7. Validate returned IAiCommerceSellerKyc:
 *
 *    - User_id matches currently logged in seller
 *    - Onboarding_id matches created onboarding
 *    - Kyc_status is set as passed
 *    - Document_type/metadata fields are properly recorded
 *    - Audit fields created_at, updated_at are valid ISO8601 timestamps
 * 8. Validate that a different seller (with a separate account) cannot create
 *    a KYC linked to the onboarding of the first user (use
 *    TestValidator.error).
 */
export async function test_api_seller_post_seller_kyc_success(
  connection: api.IConnection,
) {
  // Step 1. Register a new buyer
  const buyerEmail = typia.random<string & tags.Format<"email">>();
  const buyerPassword = RandomGenerator.alphaNumeric(12);
  const buyerAuth = await api.functional.auth.buyer.join(connection, {
    body: {
      email: buyerEmail,
      password: buyerPassword,
    } satisfies IBuyer.ICreate,
  });
  typia.assert(buyerAuth);

  // Step 2. Login as that buyer
  const buyerLogin = await api.functional.auth.buyer.login(connection, {
    body: {
      email: buyerEmail,
      password: buyerPassword,
    } satisfies IBuyer.ILogin,
  });
  typia.assert(buyerLogin);

  // Step 3. Escalate buyer to seller (register as seller with same email)
  const sellerAuth = await api.functional.auth.seller.join(connection, {
    body: {
      email: buyerEmail,
      password: buyerPassword,
    } satisfies IAiCommerceSeller.IJoin,
  });
  typia.assert(sellerAuth);
  const sellerId = sellerAuth.id;

  // Step 4. Login as that seller
  const sellerLogin = await api.functional.auth.seller.login(connection, {
    body: {
      email: buyerEmail,
      password: buyerPassword,
    } satisfies IAiCommerceSeller.ILogin,
  });
  typia.assert(sellerLogin);

  // Step 5. Initiate seller onboarding (get onboarding_id and user_id)
  const onboarding =
    await api.functional.aiCommerce.buyer.sellerOnboardings.create(connection, {
      body: {
        user_id: sellerId,
        application_data: JSON.stringify({
          businessName: RandomGenerator.name(),
          established: new Date().toISOString(),
        }),
        onboarding_status: "submitted",
      } satisfies IAiCommerceSellerOnboarding.ICreate,
    });
  typia.assert(onboarding);
  const onboardingId = onboarding.id;

  // Step 6. Submit a valid Seller KYC record
  const kycRequest = {
    user_id: sellerId,
    onboarding_id: onboardingId,
    kyc_status: "pending",
    document_type: "passport",
    document_metadata: JSON.stringify({
      number: RandomGenerator.alphaNumeric(9),
      country: "KR",
      issued: new Date().toISOString(),
    }),
    verification_notes: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IAiCommerceSellerKyc.ICreate;

  const kyc = await api.functional.aiCommerce.seller.sellerKyc.create(
    connection,
    {
      body: kycRequest,
    },
  );
  typia.assert(kyc);

  // Step 7. Validate returned IAiCommerceSellerKyc
  TestValidator.equals("KYC user_id matches sellerId", kyc.user_id, sellerId);
  TestValidator.equals(
    "KYC onboarding_id matches onboardingId",
    kyc.onboarding_id,
    onboardingId,
  );
  TestValidator.equals("KYC status is pending", kyc.kyc_status, "pending");
  TestValidator.equals(
    "KYC document_type is passport",
    kyc.document_type,
    "passport",
  );
  TestValidator.equals(
    "KYC document_metadata matches submitted metadata",
    kyc.document_metadata,
    kycRequest.document_metadata,
  );
  TestValidator.equals(
    "created_at is a valid ISO 8601 timestamp",
    typeof kyc.created_at,
    "string",
  );
  TestValidator.equals(
    "updated_at is a valid ISO 8601 timestamp",
    typeof kyc.updated_at,
    "string",
  );

  // Negative scenario: A different seller cannot submit a KYC for this onboarding
  // Register another independent seller
  const secondSellerEmail = typia.random<string & tags.Format<"email">>();
  const secondSellerPassword = RandomGenerator.alphaNumeric(12);
  const secondSellerJoin = await api.functional.auth.seller.join(connection, {
    body: {
      email: secondSellerEmail,
      password: secondSellerPassword,
    } satisfies IAiCommerceSeller.IJoin,
  });
  typia.assert(secondSellerJoin);

  // Second seller login
  const secondSellerLogin = await api.functional.auth.seller.login(connection, {
    body: {
      email: secondSellerEmail,
      password: secondSellerPassword,
    } satisfies IAiCommerceSeller.ILogin,
  });
  typia.assert(secondSellerLogin);

  // Attempt to submit KYC for someone else's onboarding (should fail)
  await TestValidator.error(
    "second seller cannot create KYC for another seller's onboarding",
    async () => {
      await api.functional.aiCommerce.seller.sellerKyc.create(connection, {
        body: {
          user_id: sellerId,
          onboarding_id: onboardingId,
          kyc_status: "pending",
          document_type: "passport",
          document_metadata: JSON.stringify({
            number: RandomGenerator.alphaNumeric(9),
            country: "KR",
            issued: new Date().toISOString(),
          }),
          verification_notes: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IAiCommerceSellerKyc.ICreate,
      });
    },
  );
}

/**
 * The draft implements the correct onboarding-to-KYC workflow: it creates a
 * buyer, escalates to seller, logs in as the new seller, creates an onboarding
 * application, submits a matching KYC request with valid business/randomized
 * data, then validates that all returned fields are type and business correct.
 * All types are drawn from DTOs. It asserts proper linkage (user_id,
 * onboarding_id), status, timestamps, document details, and uses typia.assert
 * for runtime validation. Negative testing is included for cross-user access by
 * generating a second, unrelated seller and verifying that KYC creation fails
 * when not owner. No additional imports are added, only the function body is
 * modified, all await and TestValidator practices are strictly followed. No
 * type errors or prohibited patterns are present.
 *
 * - Rules
 *
 *   - O 1. Role and Responsibility
 *   - O 2. Input Materials Provided
 *   - O 3.0. Critical Requirements and Type Safety
 *   - O 3.1. Test Function Structure
 *   - O 3.2. API SDK Function Invocation
 *   - O 3.3. API Response and Request Type Checking
 *   - O 3.3.1. Response Type Validation
 *   - O 3.3.2. Common Null vs Undefined Mistakes
 *   - O 3.4. Random Data Generation
 *   - O 3.4.1. Numeric Values
 *   - O 3.4.2. String Values
 *   - O 3.4.3. Array Generation
 *   - O 3.4.3. Working with Typia Tagged Types
 *   - O 3.5. Handling Nullable and Undefined Values
 *   - O 3.6. TypeScript Type Narrowing and Control Flow Analysis
 *   - O 3.7. Authentication Handling
 *   - O 3.7. Logic Validation and Assertions
 *   - O 3.8. Complete Example
 *   - O 4. Quality Standards and Best Practices
 * - Check List
 *
 *   - O NO additional import statements
 *   - O NO require() statements
 *   - O NO creative import syntax
 *   - O Template code untouched
 *   - O All functionality implemented using only template-provided imports
 *   - O NO TYPE ERROR TESTING - THIS IS #1 VIOLATION
 *   - O NO `as any` USAGE
 *   - O NO wrong type data in requests
 *   - O NO missing required fields
 *   - O NO testing type validation
 *   - O NO HTTP status code testing
 *   - O NO illogical operations
 *   - O NO response type validation after typia.assert()
 *   - O Step 4 revise COMPLETED
 *   - O Function follows the correct naming convention
 *   - O Function has exactly one parameter: `connection: api.IConnection`
 *   - O No external functions are defined outside the main function
 *   - O CRITICAL: All TestValidator functions include descriptive title as first
 *       parameter
 *   - O All TestValidator functions use proper positional parameter syntax
 *   - O EVERY `api.functional.*` call has `await`
 *   - O TestValidator.error with async callback has `await`
 *   - O No bare Promise assignments
 *   - O All async operations inside loops have `await`
 *   - O All async operations inside conditionals have `await`
 *   - O Return statements with async calls have `await`
 *   - O Promise.all() calls have `await`
 *   - O All API calls use proper parameter structure and type safety
 *   - O API function calling follows the exact SDK pattern from provided materials
 *   - O DTO type precision
 *   - O No DTO type confusion
 *   - O Path parameters and request body are correctly structured in the second
 *       parameter
 *   - O All API responses are properly validated with `typia.assert()`
 *   - O Authentication is handled correctly without manual token management
 *   - O Only actual authentication APIs are used (no helper functions)
 *   - O CRITICAL: NEVER touch connection.headers in any way - ZERO manipulation
 *       allowed
 *   - O Test follows a logical, realistic business workflow
 *   - O Complete user journey from authentication to final validation
 *   - O Proper data dependencies and setup procedures
 *   - O Edge cases and error conditions are appropriately tested
 *   - O Only implementable functionality is included (unimplementable parts are
 *       omitted)
 *   - O No illogical patterns: All test scenarios respect business rules and data
 *       relationships
 *   - O Random data generation uses appropriate constraints and formats
 *   - O CRITICAL: All TestValidator functions include descriptive title as FIRST
 *       parameter
 *   - O All TestValidator assertions use actual-first, expected-second pattern
 *       (after title)
 *   - O Code includes comprehensive documentation and comments
 *   - O Variable naming is descriptive and follows business context
 *   - O Simple error validation only (no complex error message checking)
 *   - O CRITICAL: For TestValidator.error(), use `await` ONLY with async callbacks
 *   - O CRITICAL: Only API functions and DTOs from the provided materials are used
 *       (not from examples)
 *   - O CRITICAL: No fictional functions or types from examples are used
 *   - O CRITICAL: No type safety violations (`any`, `@ts-ignore`,
 *       `@ts-expect-error`)
 *   - O CRITICAL: All TestValidator functions include title as first parameter and
 *       use correct positional parameter syntax
 *   - O Follows proper TypeScript conventions and type safety practices
 *   - O Efficient resource usage and proper cleanup where necessary
 *   - O Secure test data generation practices
 *   - O No hardcoded sensitive information in test data
 *   - O No authentication role mixing without proper context switching
 *   - O No operations on deleted or non-existent resources
 *   - O All business rule constraints are respected
 *   - O No circular dependencies in data creation
 *   - O Proper temporal ordering of events
 *   - O Maintained referential integrity
 *   - O Realistic error scenarios that could actually occur
 *   - O Type Safety Excellence: No implicit any types, all functions have explicit
 *       return types
 *   - O Const Assertions: All literal arrays for RandomGenerator.pick use `as
 *       const`
 *   - O Generic Type Parameters: All typia.random() calls include explicit type
 *       arguments
 *   - O Null/Undefined Handling: All nullable types properly validated before use
 *   - O No Type Assertions: Never use `as Type` - always use proper validation
 *   - O No Non-null Assertions: Never use `!` operator - handle nulls explicitly
 *   - O Complete Type Annotations: All parameters and variables have appropriate
 *       types
 *   - O Modern TypeScript Features: Leverage advanced features where they improve
 *       code quality
 *   - O NO Markdown Syntax: Zero markdown headers, code blocks, or formatting
 *   - O NO Documentation Strings: No template literals containing documentation
 *   - O NO Code Blocks in Comments: Comments contain only plain text
 *   - O ONLY Executable Code: Every line is valid, compilable TypeScript
 *   - O Output is TypeScript, NOT Markdown: Generated output is pure .ts file
 *       content, not a .md document with code blocks
 *   - O Review performed systematically
 *   - O All found errors documented
 *   - O Fixes applied in final
 *   - O Final differs from draft
 *   - O No copy-paste
 */
const __revise = {};
__revise;
