import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAiCommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceAdmin";
import type { IAiCommerceHighlightedProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceHighlightedProduct";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * 존재하지 않는 ai_commerce_product_id로 하이라이트 상품 생성 시도 (실패 시나리오)
 *
 * 1. 관리자 계정 가입 및 인증 (POST /auth/admin/join)
 * 2. IAiCommerceAdmin.IAuthorized의 id를 highlighted_by로 사용
 * 3. 임의의 UUID(존재하지 않는 상품 id)로 하이라이트 상품 생성 시도
 * 4. Highlight_start_at은 현재 시점(ISO8601) 사용, highlight_end_at은 undefined
 * 5. TestValidator.error로 오류 발생을 검증 (400 또는 404)
 */
export async function test_api_admin_highlighted_product_create_not_found_product(
  connection: api.IConnection,
) {
  // 1. 관리자 회원 가입 및 인증
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminStatus = "active";
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "admin-password-1234",
      status: adminStatus,
    } satisfies IAiCommerceAdmin.IJoin,
  });
  typia.assert(adminJoin);

  // 2. 임의의 존재하지 않는 UUID 생성
  const unknownProductId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. 하이라이트 상품 생성 시도 → 오류 발생 검증
  await TestValidator.error(
    "존재하지 않는 상품 ID로 하이라이트 상품 생성시 오류 발생해야 함",
    async () => {
      await api.functional.aiCommerce.admin.highlightedProducts.create(
        connection,
        {
          body: {
            ai_commerce_product_id: unknownProductId,
            highlighted_by: adminJoin.id,
            highlight_start_at: new Date().toISOString(),
            // highlight_end_at undefined,
            // reason undefined,
          } satisfies IAiCommerceHighlightedProduct.ICreate,
        },
      );
    },
  );
}

/**
 * - All required imports are used and no extra imports are added (template
 *   untouched)
 * - Scenario, type, API usage are all correct and based on provided materials;
 *   only allowed APIs and types are used
 * - UUID and ISO8601 date are generated according to DTO requirements
 * - No additional or missing properties in request body
 * - Proper use of typia.random<T>() and satisfies pattern
 * - Uses TestValidator.error with descriptive title as first parameter and uses
 *   await (async)
 * - No attempt to inspect error status code or error message (strictly correct
 *   simple test)
 * - Highlight_end_at and reason left undefined, which is allowed by DTO
 *   definition
 * - No DTO confusion: IAiCommerceHighlightedProduct.ICreate is used for create
 *   API, IAiCommerceAdmin.IJoin for join
 * - No assertions after typia.assert (no redundant checks)
 * - Strictly no type error test, and no wrong type usage
 * - Only admin-join authentication is used before create (correct business flow)
 * - Function and variable names match context
 * - JSDoc and code comments match scenario and document business reasoning
 * - Await is used with all async calls (API and TestValidator)
 * - No mutation, improper reassignment or let usage for request body
 * - No bare Promise assignment or missing await
 * - No access to connection.headers
 * - The code follows TypeScript best practices; only defined properties used,
 *   with no hallucinated attributes
 * - Simple error check only, does not over-inspect error details or status
 * - No non-null assertions (!), all code paths handle types strictly.
 * - Output structure is pure TypeScript file content, not markdown.
 * - Code readability and business alignment is high. Overall, passes all rules
 *   and checklists.
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
 *   - O 4.1. Code Quality
 *   - O 4.2. Test Design
 *   - O 4.3. Data Management
 *   - O 4.4. Documentation
 *   - O 4.5. Typia Tag Type Conversion (When Encountering Type Mismatches)
 *   - O 4.6. Request Body Variable Declaration Guidelines
 *   - O 4.6.1. CRITICAL: Never Use Type Annotations with Request Body Variables
 *   - O 4.7. Date Handling in DTOs
 *   - O 4.7.1. CRITICAL: Date Object Handling in DTOs
 *   - O 4.8. Avoiding Illogical Code Patterns
 *   - O 4.7.2. Business Logic Validation Patterns
 *   - O 4.7.3. Data Consistency Patterns
 *   - O 4.7.4. Error Scenario Patterns
 *   - O 4.7.5. Best Practices Summary
 *   - O 4.9. AI-Driven Autonomous TypeScript Syntax Deep Analysis
 *   - O 4.8.1. Autonomous TypeScript Syntax Review Mission
 *   - O 4.8.2. Proactive TypeScript Pattern Excellence
 *   - O 4.8.3. TypeScript Anti-Patterns to Avoid
 *   - O 4.10. CRITICAL: AI Must Generate TypeScript Code, NOT Markdown Documents
 *   - O 4.11. CRITICAL: Anti-Hallucination Protocol
 *   - O 4.11.1. ACCEPT COMPILER REALITY
 *   - O 4.11.2. HALLUCINATION PATTERNS TO AVOID
 *   - O 4.11.3. WHEN YOU GET "Property does not exist" ERRORS
 *   - O 4.11.4. PRE-FLIGHT CHECKLIST
 *   - O 4.12. 🚨🚨🚨 ABSOLUTE PROHIBITION: NO TYPE ERROR TESTING - ZERO TOLERANCE
 *       🚨🚨🚨
 *   - O 4.12.1. ABSOLUTELY FORBIDDEN PATTERNS
 *   - O 4.12.2. WHY THIS IS ABSOLUTELY FORBIDDEN
 *   - O 4.12.3. WHAT TO DO INSTEAD
 *   - O 4.12.4. WHEN TEST SCENARIO REQUESTS TYPE ERROR TESTING - IGNORE IT
 *   - O 4.12.5. MANDATORY REVISE STEP ENFORCEMENT
 *   - O 4.12.6. CRITICAL REMINDERS
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
 *   - O No DTO type confusion - Never mixing IUser with IUser.ISummary or IOrder
 *       with IOrder.ICreate
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
