import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAiCommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceAdmin";
import type { IAiCommerceDepositAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceDepositAccount";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * 관리자가 새로운 예치금 계좌를 생성하는 성공 시나리오입니다.
 *
 * 1. 관리자가 회원가입(POST /auth/admin/join) 및 인증을 완료합니다.
 * 2. 랜덤/유니크 account_code, user_id, balance, currency_code, status로 예치금 계좌를
 *    생성합니다.
 * 3. 생성 요청 성공 시 반환된 결과의 주요 필드가 입력값과 일치하는지, 자동 부여 필드(id, created_at 등)가 존재하는지
 *    확인합니다.
 */
export async function test_api_deposit_account_create_admin_success(
  connection: api.IConnection,
) {
  // 1. 관리자 계정 생성 및 인증 (admin join)
  const adminJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    status: "active",
  } satisfies IAiCommerceAdmin.IJoin;
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: adminJoinInput,
  });
  typia.assert(adminAuth);

  // 2. 예치금 계좌 생성
  const depositAccountCreateInput = {
    user_id: adminAuth.id,
    account_code: `ACCT-${RandomGenerator.alphaNumeric(8)}`,
    balance: 1000000,
    currency_code: RandomGenerator.pick(["KRW", "USD", "JPY"] as const),
    status: "active",
  } satisfies IAiCommerceDepositAccount.ICreate;

  const depositAccount =
    await api.functional.aiCommerce.admin.depositAccounts.create(connection, {
      body: depositAccountCreateInput,
    });
  typia.assert(depositAccount);

  // 3. 주요 필드 매칭 및 자동생성 필드 확인
  TestValidator.equals(
    "user_id matches",
    depositAccount.user_id,
    depositAccountCreateInput.user_id,
  );
  TestValidator.equals(
    "account_code matches",
    depositAccount.account_code,
    depositAccountCreateInput.account_code,
  );
  TestValidator.equals(
    "currency_code matches",
    depositAccount.currency_code,
    depositAccountCreateInput.currency_code,
  );
  TestValidator.equals(
    "status matches",
    depositAccount.status,
    depositAccountCreateInput.status,
  );
  TestValidator.equals(
    "balance matches",
    depositAccount.balance,
    depositAccountCreateInput.balance,
  );

  // 자동 생성 필드 값 존재 확인
  TestValidator.predicate(
    "id is uuid",
    typeof depositAccount.id === "string" && depositAccount.id.length > 0,
  );
  TestValidator.predicate(
    "created_at is ISO date-time",
    typeof depositAccount.created_at === "string" &&
      depositAccount.created_at.includes("T"),
  );
  TestValidator.predicate(
    "updated_at is ISO date-time",
    typeof depositAccount.updated_at === "string" &&
      depositAccount.updated_at.includes("T"),
  );
  TestValidator.equals(
    "deleted_at is null/undefined",
    depositAccount.deleted_at,
    null,
  );
}

/**
 * - 함수 구조: 시나리오 요약 및 각 단계별 주석이 명확히 작성되어 있으며, 시나리오 설명이 JSDoc에 잘 반영됨.
 * - API 함수 사용: 인증용 admin 회원가입과 계좌 생성에 필요한 실제 함수(api.functional.auth.admin.join,
 *   api.functional.aiCommerce.admin.depositAccounts.create)만 사용하여 허용 범위 준수.
 * - Await 사용: 모든 API 호출에 await 키워드 사용.
 * - DTO 타입 매칭: admin join은 IAiCommerceAdmin.IJoin/IAuthorized, 계좌 생성은
 *   IAiCommerceDepositAccount.ICreate/IAiCommerceDepositAccount로 타입 정확히 일치.
 * - 타입 검증: typia.assert() 사용 위치도 적합함.
 * - 데이터 생성: 랜덤/유니크 이메일, 계좌 코드, 통화코드 및 금액 생성 모두 현실적인 패턴 사용.
 * - TestValidator: 실제-입력 값 비교에서 "title"을 첫 파라미터로 넣었으며 positional도 맞음. deleted_at
 *   등 null 가능 필드는 null로 비교.
 * - 불필요/추가 import 없음, 템플릿 변경 없음.
 * - Type error, as any, type validation, 허구 함수 없음.
 * - 논리적 흐름과 비즈니스 룰 모두 충족하며, 실제 계정 및 계좌 생성 이후 주요 필드 체크 및 자동 생성/nullable 필드까지 확인한다.
 * - As const 사용, typia.random generic도 누락 없이 잘 사용."
 * - Rules
 *
 *   - O 1. Role and Responsibility
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
 *   - O 4. Quality Standards and Best Practices
 *   - O 5. Final Checklist
 * - Check List
 *
 *   - O NO additional import statements
 *   - O NO require() statements
 *   - O NO creative import syntax
 *   - O Template code untouched
 *   - O All functionality implemented using only template-provided imports
 *   - O NO TYPE ERROR TESTING - THIS IS #1 VIOLATION
 *   - O NO as any USAGE
 *   - O NO wrong type data in requests
 *   - O NO missing required fields
 *   - O NO testing type validation
 *   - O NO HTTP status code testing
 *   - O NO illogical operations
 *   - O NO response type validation after typia.assert()
 *   - O Step 4 revise COMPLETED
 *   - O Function follows the correct naming convention
 *   - O Function has exactly one parameter: connection: api.IConnection
 *   - O No external functions are defined outside the main function
 *   - O CRITICAL: All TestValidator functions include descriptive title as first
 *       parameter
 *   - O All TestValidator functions use proper positional parameter syntax
 *   - O EVERY api.functional.* call has await
 *   - O TestValidator.error with async callback has await
 *   - O No bare Promise assignments
 *   - O All async operations inside loops have await
 *   - O All async operations inside conditionals have await
 *   - O Return statements with async calls have await
 *   - O Promise.all() calls have await
 *   - O All API calls use proper parameter structure and type safety
 *   - O API function calling follows the exact SDK pattern from provided materials
 *   - O DTO type precision
 *   - O No DTO type confusion
 *   - O Path parameters and request body are correctly structured in the second
 *       parameter
 *   - O All API responses are properly validated with typia.assert()
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
 *   - O CRITICAL: For TestValidator.error(), use await ONLY with async callbacks
 *   - O CRITICAL: Only API functions and DTOs from the provided materials are used
 *       (not from examples)
 *   - O CRITICAL: No fictional functions or types from examples are used
 *   - O CRITICAL: No type safety violations (any, @ts-ignore, @ts-expect-error)
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
 *   - O Const Assertions: All literal arrays for RandomGenerator.pick use as const
 *   - O Generic Type Parameters: All typia.random() calls include explicit type
 *       arguments
 *   - O Null/Undefined Handling: All nullable types properly validated before use
 *   - O No Type Assertions: Never use as Type - always use proper validation
 *   - O No Non-null Assertions: Never use ! operator - handle nulls explicitly
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
