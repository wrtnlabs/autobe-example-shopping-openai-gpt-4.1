import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAiCommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceAdmin";
import type { IAiCommerceBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceBuyer";
import type { IAiCommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceSeller";
import type { IAiCommerceSellerOnboarding } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceSellerOnboarding";
import type { IAiCommerceSellerProfiles } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceSellerProfiles";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IBuyer";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIAiCommerceSellerProfiles } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAiCommerceSellerProfiles";

/**
 * Test advanced filtering and pagination for admin sellerProfiles search
 *
 * This test covers the end-to-end workflow for searching seller profiles
 * behind the admin endpoint with advanced filters and pagination:
 *
 * 1. Register an admin, a seller, and a buyer account, and log in each at key
 *    steps
 * 2. As buyer, submit onboarding for seller
 * 3. As seller, create a seller profile with unique display name and a
 *    specific approval status
 * 4. Switch role to admin and perform a filtered, paginated search including
 *    approval_status and display_name
 * 5. Validate that the response includes the created profile, with correct
 *    field matches and that the pagination reflects expectations
 * 6. As a negative test, verify non-admin cannot access the search API
 */
export async function test_api_sellerprofiles_advanced_search_and_pagination(
  connection: api.IConnection,
) {
  // 1. Register and authenticate admin with unique email
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
  // 2. Register and authenticate seller with unique email
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(12);
  const sellerJoin = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
    } satisfies IAiCommerceSeller.IJoin,
  });
  typia.assert(sellerJoin);
  // 3. Register and authenticate buyer
  const buyerEmail = typia.random<string & tags.Format<"email">>();
  const buyerPassword = RandomGenerator.alphaNumeric(12);
  const buyerJoin = await api.functional.auth.buyer.join(connection, {
    body: {
      email: buyerEmail,
      password: buyerPassword,
    } satisfies IBuyer.ICreate,
  });
  typia.assert(buyerJoin);
  // 4. As buyer, login
  await api.functional.auth.buyer.login(connection, {
    body: {
      email: buyerEmail,
      password: buyerPassword,
    } satisfies IBuyer.ILogin,
  });
  // 5. As buyer, submit seller onboarding with supplied seller's user_id
  const onboarding =
    await api.functional.aiCommerce.buyer.sellerOnboardings.create(connection, {
      body: {
        user_id: sellerJoin.id,
        application_data: '{"kycPassed":true}',
        onboarding_status: "submitted",
      } satisfies IAiCommerceSellerOnboarding.ICreate,
    });
  typia.assert(onboarding);
  // 6. As seller, login
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
    } satisfies IAiCommerceSeller.ILogin,
  });
  const profileDisplayName = RandomGenerator.name();
  // 7. As seller, create seller profile
  const sellerProfile =
    await api.functional.aiCommerce.seller.sellerProfiles.create(connection, {
      body: {
        user_id: sellerJoin.id,
        display_name: profileDisplayName,
        approval_status: "active",
      } satisfies IAiCommerceSellerProfiles.ICreate,
    });
  typia.assert(sellerProfile);
  // 8. As admin, login
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IAiCommerceAdmin.ILogin,
  });
  // 9. Search as admin for the seller profile with approval_status and display_name, with pagination
  const limit = 5;
  const page = 1;
  const searchResp = await api.functional.aiCommerce.admin.sellerProfiles.index(
    connection,
    {
      body: {
        approval_status: "active",
        display_name: profileDisplayName,
        limit,
        page,
      } satisfies IAiCommerceSellerProfiles.IRequest,
    },
  );
  typia.assert(searchResp);
  // 10. Verify the returned seller profile is present and matches
  TestValidator.predicate(
    "search must contain created profile",
    searchResp.data.some(
      (p) =>
        p.id === sellerProfile.id &&
        p.display_name === sellerProfile.display_name &&
        p.approval_status === sellerProfile.approval_status &&
        p.user_id === sellerProfile.user_id,
    ),
  );
  // 11. Pagination fields
  TestValidator.equals("pagination page", searchResp.pagination.current, page);
  TestValidator.equals("pagination limit", searchResp.pagination.limit, limit);
  // 12. Negative test - seller cannot search
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
    } satisfies IAiCommerceSeller.ILogin,
  });
  await TestValidator.error(
    "non-admin cannot access sellerProfiles search",
    async () => {
      await api.functional.aiCommerce.admin.sellerProfiles.index(connection, {
        body: {
          approval_status: "active",
          display_name: profileDisplayName,
          limit,
          page,
        } satisfies IAiCommerceSellerProfiles.IRequest,
      });
    },
  );
}

/**
 * 1. Template, naming, and import rules: All requirements satisfied; only template
 *    area filled. No extra import or function changes.
 * 2. Typed random data: typia.random (with correct tags) and RandomGenerator are
 *    used throughout, maintaining type safety. All DTO variants correctly
 *    matched to APIs (ICreate, IJoin, IRequest).
 * 3. Authentication and multi-actor: Auth, login, and context switches are always
 *    through actual API endpoints—never touching connection.headers. Buyer and
 *    seller are joined, logged in, and used appropriately. Admin role is
 *    established and used for the main search operation.
 * 4. Business logic: Seller onboarding is created as buyer (with correct seller
 *    user_id linking), then seller profile is created by seller after
 *    onboarding, and searched by admin with exact filter criteria. Data
 *    dependencies and referential integrity are maintained.
 * 5. Search function: The sellerProfiles.index API is called with paginated
 *    filters; the response is validated for content correctness, and pagination
 *    controls are checked.
 * 6. Predicate and error assertion: TestValidator.predicate uses descriptive
 *    titles. TestValidator.error title present; wrapped in async, directly
 *    awaiting. Negative test (non-admin cannot search) uses seller
 *    authentication, then asserts proper rejection. No business logic or type
 *    errors bypassed.
 * 7. Response and pagination: Verifies created profile is present in search, field
 *    values all match, pagination is explicitly checked (current, limit). All
 *    typia.asserts are present for responses, and all API calls are properly
 *    awaited.
 * 8. No type error validation, missing fields, type assertions, or
 *    fictional/nonexistent properties anywhere. All TestValidator, data flow,
 *    and API contract patterns are compliant. No illogical or impossible
 *    operations. Full compliance with scenario and implementation patterns.
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
 *   - O 3.3.2. Common Null vs Undefined Mistakes
 *   - O 3.4. Random Data Generation
 *   - O 3.5. Handling Nullable and Undefined Values
 *   - O 3.6. TypeScript Type Narrowing and Control Flow Analysis
 *   - O 3.7. Authentication Handling
 *   - O 3.7. Logic Validation and Assertions
 *   - O 4. Quality Standards and Best Practices
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
 *   - O All functionality implemented
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
 *   - O Type Safety Excellence
 *   - O Const Assertions
 *   - O Generic Type Parameters
 *   - O Null/Undefined Handling
 *   - O No Type Assertions
 *   - O No Non-null Assertions
 *   - O Complete Type Annotations
 *   - O Modern TypeScript Features
 *   - O NO Markdown Syntax
 *   - O NO Documentation Strings
 *   - O NO Code Blocks in Comments
 *   - O ONLY Executable Code
 *   - O Output is TypeScript, NOT Markdown
 *   - O Review performed systematically
 *   - O All found errors documented
 *   - O Fixes applied in final
 *   - O Final differs from draft
 *   - O No copy-paste
 */
const __revise = {};
__revise;
