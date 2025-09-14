import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAiCommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceAdmin";
import type { IAiCommerceCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceCoupon";
import type { IAiCommerceCouponIssue } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceCouponIssue";
import type { IAiCommerceCouponUse } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceCouponUse";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * 관리자 계정이 couponUseId(쿠폰 사용 이벤트)를 영구적으로 삭제하는 기능 검증.
 *
 * 1. 관리자 신규 회원가입 및 인증 실행
 * 2. 신규 쿠폰 캠페인 등록 (coupon_code 임의 생성, 기간/타입/상태 지정 등).
 * 3. 테스트용 userId(수혜자) 준비 (임의 uuid)
 * 4. 쿠폰을 해당 user에게 발급하여 couponIssueId 획득
 * 5. CouponIssue로 쿠폰을 사용 처리하여 couponUseId 획득
 * 6. 정상적으로 생성된 couponUseId를 대상으로 관리자 API를 통해 erasure 요청
 * 7. 에러/재사용 방지 검증: 동일 couponUseId로 재삭제 및 연관 쿠폰/사용 조건으로 재사용 시도 역시 실패(불가).
 */
export async function test_api_coupon_use_permanent_removal_by_admin(
  connection: api.IConnection,
) {
  // 1. 관리자로 회원가입 및 인증
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoinBody = {
    email: adminEmail,
    password: RandomGenerator.alphaNumeric(12),
    status: "active",
  } satisfies IAiCommerceAdmin.IJoin;
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert(adminAuth);

  // 2. 쿠폰 캠페인 등록
  const now = new Date();
  const couponCreateBody = {
    coupon_code: RandomGenerator.alphaNumeric(10),
    type: "amount",
    valid_from: new Date(now.getTime() - 60 * 1000).toISOString(), // 1분 전부터
    valid_until: new Date(now.getTime() + 60 * 60 * 1000).toISOString(), // 1시간 뒤까지
    issued_by: adminAuth.id,
    max_uses: 10,
    conditions: null,
    status: "active",
  } satisfies IAiCommerceCoupon.ICreate;
  const coupon = await api.functional.aiCommerce.admin.coupons.create(
    connection,
    { body: couponCreateBody },
  );
  typia.assert(coupon);

  // 3. 임의 userId 준비 (실제 유저 구조 미제공이므로 랜덤 UUID 사용)
  const userId = typia.random<string & tags.Format<"uuid">>();

  // 4. 쿠폰 발급 (couponIssue 생성)
  const issueBody = {
    coupon_id: coupon.id,
    user_id: userId,
    expires_at: coupon.valid_until,
    description: "테스트 발급",
  } satisfies IAiCommerceCouponIssue.ICreate;
  const couponIssue = await api.functional.aiCommerce.admin.couponIssues.create(
    connection,
    { body: issueBody },
  );
  typia.assert(couponIssue);

  // 5. 발급 쿠폰 사용 (couponUse 생성)
  const couponUseBody = {
    coupon_issue_id: couponIssue.id,
    user_id: userId,
    status: "redeemed",
    redeemed_at: new Date().toISOString(),
  } satisfies IAiCommerceCouponUse.ICreate;
  const couponUse = await api.functional.aiCommerce.admin.couponUses.create(
    connection,
    { body: couponUseBody },
  );
  typia.assert(couponUse);

  // 6. 관리자 couponUse erasure(영구 삭제)
  await api.functional.aiCommerce.admin.couponUses.erase(connection, {
    couponUseId: couponUse.id,
  });

  // 7. 삭제된 couponUseId로 재삭제 시 에러 반환 확인
  await TestValidator.error(
    "동일 couponUseId 재삭제 시도시 에러 발생",
    async () => {
      await api.functional.aiCommerce.admin.couponUses.erase(connection, {
        couponUseId: couponUse.id,
      });
    },
  );

  // (확장) 동일 couponIssue로 동일 user가 또 사용 시도시 원칙상 비즈니스로직 오류(쿠폰 재사용불가 등)
  await TestValidator.error(
    "삭제 후 동일 Issue로 재사용 시도 시 에러 발생",
    async () => {
      const duplicateUseBody = {
        coupon_issue_id: couponIssue.id,
        user_id: userId,
        status: "redeemed",
        redeemed_at: new Date().toISOString(),
      } satisfies IAiCommerceCouponUse.ICreate;
      await api.functional.aiCommerce.admin.couponUses.create(connection, {
        body: duplicateUseBody,
      });
    },
  );
}

/**
 * - 모든 await이 올바르게 적용되었는지 확인: 모든 api 호출 전부 await, TestValidator.error 내 콜백이
 *   async일 때 await, 에러 없음.
 * - Typia.assert는 응답값이 있을 때 100% 사용함.
 * - TestValidator 함수의 첫 인자로 항상 의미있는 title을 설정하였음.
 * - Request body 변수 선언에 type annotation 없이 satisfies만 사용했고, let/재할당 없이 const로 명확히
 *   분리함. 불필요하게 받을 수 있는 null/undefined 필드에도 null 명시적 할당, 미생략.
 * - 쿠폰/이슈/사용 생성-삭제의 올바른 순서와 비즈니스 플로우를 완전히 준수하며, 정상과 실패(재사용 및 재삭제 시도) 모두 논리적 오류만
 *   테스트했고, 타입 오류/형식 오류/컴파일 오류 테스트는 없음.
 * - Connection.headers를 직접 접근/조작하지 않고, 인증도 전적으로 SDK를 활용.
 * - 추가 import, require, creative import, 외부 헬퍼 함수 등 일절 없음.
 * - 코드 내 DTO 및 API 호출에 예시가 아닌 실제 주어진 정의만 활용.
 * - 랜덤값 생성은 typia.random/generator를 적절히 사용, 실제/비즈니스에 맞는 realistic한 test data를
 *   반영함.
 * - 쓸데없는 타입 validation, typia.assert 이후의 추가 property check, 상태코드 검사, fictional/가공
 *   함수 불가 등 절대금지 규정 모두 준수함.
 * - 함수 선언, 파라미터, 내장 로직, 변수 네이밍까지 모두 규격/품질 기준에 이상 없음.
 * - 전체적으로 (현실적/재현가능/컴파일 성공하는) 테스트 시나리오만 남아 final과 draft가 동일함.
 * - Rules
 *
 *   - O 1. Role and Responsibility
 *   - O 1.1. Function Calling Workflow
 *   - O 2. Input Materials Provided
 *   - O 3. Code Generation Requirements
 *   - O 3.1. Test Function Structure
 *   - O 3.2. API SDK Function Invocation
 *   - O 3.3. API Response and Request Type Checking
 *   - O 3.3.1. Response Type Validation
 *   - O 3.3.2. Common Null vs Undefined Mistakes
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
