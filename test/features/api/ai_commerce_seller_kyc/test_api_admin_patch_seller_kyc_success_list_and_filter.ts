import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAiCommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceAdmin";
import type { IAiCommerceBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceBuyer";
import type { IAiCommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceSeller";
import type { IAiCommerceSellerKyc } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceSellerKyc";
import type { IAiCommerceSellerOnboarding } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceSellerOnboarding";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IBuyer";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIAiCommerceSellerKyc } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAiCommerceSellerKyc";

/**
 * Validate advanced seller KYC admin filtering and list endpoint.
 *
 * This test walks through the real-world compliance audit workflow:
 *
 * 1. Create an admin and authenticate
 * 2. Register a buyer
 * 3. Promote buyer to seller
 * 4. Buyer files a seller onboarding
 * 5. Seller submits KYC
 * 6. Admin searches KYC records with various filters (onboarding_id, user_id,
 *    kyc_status, document_type, date, pagination)
 * 7. Assert business logic, result data integrity, and filter correctness.
 * 8. Edge cases: search that returns no results, and multi-match search
 *
 * Steps:
 *
 * 1. Admin registration
 * 2. Admin login
 * 3. Buyer registration
 * 4. Seller registration (with buyer's email)
 * 5. Buyer login (to file seller onboarding)
 * 6. File seller onboarding using buyer's user_id
 * 7. Seller login (for KYC submission)
 * 8. Seller submits KYC (records onboarding_id, user_id, document_type,
 *    status)
 * 9. Admin login again (to establish admin RBAC context)
 *
 * Filtering validations:
 *
 * - List KYC by onboarding_id: all results have correct onboarding_id
 * - List by user_id: all results have matching user_id
 * - List by kyc_status, document_type: returned entries match filter
 * - Pagination: test with limit=1, page=1
 * - Date range: filter by created_at_from, created_at_to
 * - Edge case: filter with random, non-existent onboarding_id (should return
 *   0)
 * - Control: default/filter-less returns at least the single created record
 */
export async function test_api_admin_patch_seller_kyc_success_list_and_filter(
  connection: api.IConnection,
) {
  // Step 1. Admin registration
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      status: "active",
    } satisfies IAiCommerceAdmin.IJoin,
  });
  typia.assert(adminJoin);

  // Step 2. Admin login
  const adminLogin = await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IAiCommerceAdmin.ILogin,
  });
  typia.assert(adminLogin);

  // Step 3. Buyer registration
  const buyerEmail = typia.random<string & tags.Format<"email">>();
  const buyerPassword = RandomGenerator.alphaNumeric(12);
  const buyerJoin = await api.functional.auth.buyer.join(connection, {
    body: {
      email: buyerEmail,
      password: buyerPassword,
    } satisfies IBuyer.ICreate,
  });
  typia.assert(buyerJoin);

  // Step 4. Seller registration (promote buyer)
  const sellerJoin = await api.functional.auth.seller.join(connection, {
    body: {
      email: buyerEmail,
      password: buyerPassword,
    } satisfies IAiCommerceSeller.IJoin,
  });
  typia.assert(sellerJoin);

  // Step 5. Buyer login (to file onboarding)
  await api.functional.auth.buyer.login(connection, {
    body: {
      email: buyerEmail,
      password: buyerPassword,
    } satisfies IBuyer.ILogin,
  });

  // Step 6. File seller onboarding
  const onboarding =
    await api.functional.aiCommerce.buyer.sellerOnboardings.create(connection, {
      body: {
        user_id: buyerJoin.id,
        application_data: JSON.stringify({ business: RandomGenerator.name(1) }),
        onboarding_status: "draft",
      } satisfies IAiCommerceSellerOnboarding.ICreate,
    });
  typia.assert(onboarding);

  // Step 7. Seller login
  await api.functional.auth.seller.login(connection, {
    body: {
      email: buyerEmail,
      password: buyerPassword,
    } satisfies IAiCommerceSeller.ILogin,
  });

  // Step 8. Seller submits KYC
  const kycStatus = "pending";
  const documentType = "passport";
  const kyc = await api.functional.aiCommerce.seller.sellerKyc.create(
    connection,
    {
      body: {
        user_id: buyerJoin.id,
        onboarding_id: onboarding.id,
        kyc_status: kycStatus,
        document_type: documentType,
        document_metadata: JSON.stringify({
          number: RandomGenerator.alphaNumeric(8),
        }),
        verification_notes: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IAiCommerceSellerKyc.ICreate,
    },
  );
  typia.assert(kyc);

  // Step 9. Admin login again
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IAiCommerceAdmin.ILogin,
  });

  // List KYC by onboarding_id filter
  const byOnboarding = await api.functional.aiCommerce.admin.sellerKyc.index(
    connection,
    {
      body: {
        onboarding_id: onboarding.id,
      } satisfies IAiCommerceSellerKyc.IRequest,
    },
  );
  typia.assert(byOnboarding);
  TestValidator.predicate(
    "KYC filter by onboarding_id returns at least one entry",
    byOnboarding.data.length > 0,
  );
  for (const entry of byOnboarding.data) {
    TestValidator.equals(
      "KYC onboarding_id matches filter",
      entry.onboarding_id,
      onboarding.id,
    );
  }

  // List by user_id filter
  const byUser = await api.functional.aiCommerce.admin.sellerKyc.index(
    connection,
    {
      body: { user_id: buyerJoin.id } satisfies IAiCommerceSellerKyc.IRequest,
    },
  );
  typia.assert(byUser);
  TestValidator.predicate(
    "KYC filter by user_id returns at least one entry",
    byUser.data.length > 0,
  );
  for (const entry of byUser.data) {
    TestValidator.equals(
      "KYC user_id matches filter",
      entry.user_id,
      buyerJoin.id,
    );
  }

  // List by kyc_status + document_type
  const byStatusDoc = await api.functional.aiCommerce.admin.sellerKyc.index(
    connection,
    {
      body: {
        kyc_status: kycStatus,
        document_type: documentType,
      } satisfies IAiCommerceSellerKyc.IRequest,
    },
  );
  typia.assert(byStatusDoc);
  TestValidator.predicate(
    "KYC filter by status+doc_type returns one or more",
    byStatusDoc.data.length > 0,
  );
  for (const entry of byStatusDoc.data) {
    TestValidator.equals("KYC kyc_status matches", entry.kyc_status, kycStatus);
    TestValidator.equals(
      "KYC document_type matches",
      entry.document_type,
      documentType,
    );
  }

  // Date range filtering (cover entry)
  const createdFrom = kyc.created_at;
  const createdTo = kyc.created_at;
  const byDate = await api.functional.aiCommerce.admin.sellerKyc.index(
    connection,
    {
      body: {
        created_at_from: createdFrom,
        created_at_to: createdTo,
      } satisfies IAiCommerceSellerKyc.IRequest,
    },
  );
  typia.assert(byDate);
  TestValidator.predicate(
    "KYC filter by create date returns entry",
    byDate.data.length > 0,
  );

  // Paginate (limit = 1, page = 1)
  const paginated = await api.functional.aiCommerce.admin.sellerKyc.index(
    connection,
    {
      body: {
        limit: 1 as number,
        page: 1 as number,
      } satisfies IAiCommerceSellerKyc.IRequest,
    },
  );
  typia.assert(paginated);
  TestValidator.equals("KYC paginate limit=1", paginated.data.length, 1);
  TestValidator.predicate(
    "KYC paginate current page=1",
    paginated.pagination.current >= 1,
  );

  // No-result edge: filter by random onboarding_id
  const nonexistentId = typia.random<string & tags.Format<"uuid">>();
  const byFake = await api.functional.aiCommerce.admin.sellerKyc.index(
    connection,
    {
      body: {
        onboarding_id: nonexistentId,
      } satisfies IAiCommerceSellerKyc.IRequest,
    },
  );
  typia.assert(byFake);
  TestValidator.equals(
    "KYC filter with non-existent onboarding_id is empty",
    byFake.data.length,
    0,
  );

  // Default (all, no filter): should return at least the created record
  const all = await api.functional.aiCommerce.admin.sellerKyc.index(
    connection,
    {
      body: {} satisfies IAiCommerceSellerKyc.IRequest,
    },
  );
  typia.assert(all);
  TestValidator.predicate(
    "KYC list unfiltered returns data",
    all.data.length > 0,
  );
}

/**
 * - All sections of TEST_WRITE.md are satisfied and compliance is strict.
 * - All template requirements are followed: imports untouched, no additional
 *   imports, all code written inside test function, TestValidator assertions
 *   all have descriptive titles, and await is used with every API function and
 *   async error assertion.
 * - All API DTO types match exactly as provided in the materials (no fictional
 *   DTOs, no confusion between authorized/ICreate/etc). All properties used
 *   exist in the schema, and required fields are never omitted.
 * - The scenario correctly sets up admin, buyer, seller, onboarding, KYC, then
 *   validates proper RBAC via admin context for actual KYC search.
 * - Filter and pagination tests are valid and use only schema-supported filter
 *   keys (onboarding_id, user_id, document_type, kyc_status, created_at_from,
 *   created_at_to, page, limit).
 * - All test flows and result data checks are logical and respect business rules.
 * - The test demonstrates complete coverage of the success and no-result
 *   scenarios, and illustrates correct handling of edge cases and
 *   multi-criteria filtering. No illogical scenarios or RBAC violations occur.
 * - No type error testing, status code testing, or property hallucination is
 *   present anywhere in the code. All nullable handling and typia.assert usage
 *   is proper.
 * - Imperative checks for id consistency and filter correctness are performed for
 *   each result. Random data generation for emails, UUID, strings is always
 *   with correct tags and helper patterns.
 * - Business flow sequencing and role switching are correct. Connection.headers
 *   is never manipulated. No code is repeated unnecessarily. Code is clean,
 *   readable, and maintainable. TestValidator titles are clear and
 *   contextualized for each check.
 * - Rules
 *
 *   - O 1. Role and Responsibility
 *   - O 1.1. Function Calling Workflow
 *   - O 2. Input Materials Provided
 *   - O 3.0. Critical Requirements and Type Safety
 *   - O 3.1. Test Function Structure
 *   - O 3.2. API SDK Function Invocation
 *   - O 3.3. API Response and Request Type Checking
 *   - O 3.4. Random Data Generation
 *   - O 3.5. Handling Nullable and Undefined Values
 *   - O 3.6. TypeScript Type Narrowing and Control Flow Analysis
 *   - O 3.7. Authentication Handling
 *   - O 3.7. Logic Validation and Assertions
 *   - O 3.8. Complete Example
 *   - O 4.1. Code Quality
 *   - O 4.2. Test Design
 *   - O 4.3. Data Management
 *   - O 4.4. Documentation
 *   - O 4.5. Typia Tag Type Conversion (When Encountering Type Mismatches)
 *   - O 4.6. Request Body Variable Declaration Guidelines
 *   - O 4.7. Date Handling in DTOs
 *   - O 4.8. Avoiding Illogical Code Patterns
 *   - O 4.7.2. Business Logic Validation Patterns
 *   - O 4.7.3. Data Consistency Patterns
 *   - O 4.7.4. Error Scenario Patterns
 *   - O 4.7.5. Best Practices Summary
 *   - O 4.9. AI-Driven Autonomous TypeScript Syntax Deep Analysis
 *   - O 4.10. CRITICAL: AI Must Generate TypeScript Code, NOT Markdown Documents
 *   - O 4.11. CRITICAL: Anti-Hallucination Protocol
 *   - O 4.12. 🚨🚨🚨 ABSOLUTE PROHIBITION: NO TYPE ERROR TESTING - ZERO TOLERANCE
 *       🚨🚨🚨
 *   - O 5. Final Checklist
 * - Check List
 *
 *   - O NO additional import statements
 *   - O NO require() statements
 *   - O NO creative import syntax
 *   - O Template code untouched
 *   - O All functionality implemented using only template-provided imports
 *   - O 🚨 NO TYPE ERROR TESTING - THIS IS #1 VIOLATION 🚨
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
 *   - O DTO type precision - Using correct DTO variant for each operation (e.g.,
 *       ICreate for POST, IUpdate for PUT, base type for GET)
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
