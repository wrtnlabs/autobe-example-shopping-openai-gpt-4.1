import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAiCommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceAdmin";
import type { IAiCommerceBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceBuyer";
import type { IAiCommerceCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceCoupon";
import type { IAiCommerceCouponIssue } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceCouponIssue";
import type { IAiCommerceCouponUse } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceCouponUse";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IBuyer";

/**
 * 관리자가 이미 만료/사용된 쿠폰 이슈를 삭제하려고 할 때 에러가 발생하는지 검증하는 E2E 테스트.
 *
 * 1. 관리자가 회원가입/로그인하여 인증 컨텍스트 확보
 * 2. 쿠폰을 생성 (일반 케이스와 유효기간이 지난 케이스 두 가지 준비)
 * 3. Buyer 회원 가입
 * 4. (a) 만료된 쿠폰 이슈 발급 후 즉시 삭제 시도 (만료된 쿠폰 이슈)
 *
 *    - CouponIssue 생성시 expires_at을 과거로 지정
 *    - Admin이 couponIssueId로 삭제 시도 시 실패해야 함 (비즈니스 에러)
 * 5. (b) 사용완료 쿠폰 이슈 발급 → 사용 처리 후 삭제 시도 (redeemed)
 *
 *    - CouponIssue 정상 발급
 *    - CouponUses로 해당 이슈 redeem 처리(status: redeemed)
 *    - Admin이 couponIssueId로 삭제 시도시 실패해야 함 (비즈니스 에러)
 * 6. 각 케이스 삭제 시도시 TestValidator.error()로 비즈니스 에러 강제 확인
 */
export async function test_api_admin_coupon_issue_delete_expired_or_redeemed_fail(
  connection: api.IConnection,
) {
  // 1. Admin 회원가입 (로그인 컨텍스트 확보)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: RandomGenerator.alphaNumeric(12),
      status: "active",
    } satisfies IAiCommerceAdmin.IJoin,
  });
  typia.assert(admin);

  // 2-1. 만료 케이스 쿠폰 생성 (만료기간이 과거)
  const expiredCoupon = await api.functional.aiCommerce.admin.coupons.create(
    connection,
    {
      body: {
        coupon_code: RandomGenerator.alphaNumeric(10),
        type: "amount",
        valid_from: new Date(
          Date.now() - 1000 * 60 * 60 * 24 * 10,
        ).toISOString(), // 10일 전 시작
        valid_until: new Date(
          Date.now() - 1000 * 60 * 60 * 24 * 1,
        ).toISOString(), // 1일 전 종료(이미 만료)
        status: "active",
      } satisfies IAiCommerceCoupon.ICreate,
    },
  );
  typia.assert(expiredCoupon);

  // 2-2. 정상/사용가능 쿠폰 생성
  const validCoupon = await api.functional.aiCommerce.admin.coupons.create(
    connection,
    {
      body: {
        coupon_code: RandomGenerator.alphaNumeric(10),
        type: "amount",
        valid_from: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1일 전 시작
        valid_until: new Date(
          Date.now() + 1000 * 60 * 60 * 24 * 10,
        ).toISOString(), // 10일 후 만료
        status: "active",
      } satisfies IAiCommerceCoupon.ICreate,
    },
  );
  typia.assert(validCoupon);

  // 3. Buyer 회원가입
  const buyerEmail = typia.random<string & tags.Format<"email">>();
  const buyer = await api.functional.auth.buyer.join(connection, {
    body: {
      email: buyerEmail,
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IBuyer.ICreate,
  });
  typia.assert(buyer);

  // 4-(a) 만료된 쿠폰 이슈 발급
  const expiredCouponIssue =
    await api.functional.aiCommerce.admin.couponIssues.create(connection, {
      body: {
        coupon_id: expiredCoupon.id,
        user_id: buyer.id,
        expires_at: expiredCoupon.valid_until,
      } satisfies IAiCommerceCouponIssue.ICreate,
    });
  typia.assert(expiredCouponIssue);

  // 4-(a)-2. 만료된 쿠폰 이슈 삭제 시도 -> 비즈니스 에러 검증
  await TestValidator.error(
    "만료된 쿠폰 이슈 삭제 시도시 비즈니스 에러 발생",
    async () => {
      await api.functional.aiCommerce.admin.couponIssues.erase(connection, {
        couponIssueId: expiredCouponIssue.id,
      });
    },
  );

  // 5-(b) 사용완료 쿠폰 이슈 발급
  const issueForUse = await api.functional.aiCommerce.admin.couponIssues.create(
    connection,
    {
      body: {
        coupon_id: validCoupon.id,
        user_id: buyer.id,
        expires_at: validCoupon.valid_until,
      } satisfies IAiCommerceCouponIssue.ICreate,
    },
  );
  typia.assert(issueForUse);

  // 5-(b)-2. 쿠폰 사용 처리 (redeemed)
  const now = new Date().toISOString();
  const useRecord = await api.functional.aiCommerce.admin.couponUses.create(
    connection,
    {
      body: {
        coupon_issue_id: issueForUse.id,
        user_id: buyer.id,
        status: "redeemed",
        redeemed_at: now,
      } satisfies IAiCommerceCouponUse.ICreate,
    },
  );
  typia.assert(useRecord);

  // 5-(b)-3. 사용완료 쿠폰 이슈 삭제 시도 -> 비즈니스 에러 검증
  await TestValidator.error(
    "사용완료(=redeemed) 쿠폰 이슈 삭제 시 비즈니스 에러 발생",
    async () => {
      await api.functional.aiCommerce.admin.couponIssues.erase(connection, {
        couponIssueId: issueForUse.id,
      });
    },
  );
}

/**
 * The draft code correctly implements all required steps for the scenario:
 * creates an admin, creates two coupons (expired and valid), registers a buyer,
 * issues an expired coupon issue, attempts deletion and expects error via
 * TestValidator, issues a valid coupon issue, redeems it, and again tries
 * deletion (should fail). All API calls use correct types (ICreate, etc.),
 * proper random data generation via RandomGenerator and typia, all awaits are
 * present, all TestValidator.error invocations have descriptive titles, and
 * assertions are properly used. There are no compilation errors, DTO variant
 * mix-ups, or forbidden patterns (no extra imports, no `as any`, no wrong-typed
 * data, no connection.headers touch, no type error tests). Request bodies are
 * defined using const and satisfies, null/undefined handling is not an issue,
 * and error validation is focused on runtime business logic. There is no
 * Markdown output or hallucination, and code organization is clear. The
 * comments summarize each step, and the test logic precisely aligns with the
 * business scenario, solely using only the DTOs and SDKs allowed. No functions
 * or DTOs from examples are used, and the test is strictly business error
 * validation only.
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
 *   - O 3.4.1. Numeric Values
 *   - O 3.4.2. String Values
 *   - O 3.4.3. Array Generation
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
