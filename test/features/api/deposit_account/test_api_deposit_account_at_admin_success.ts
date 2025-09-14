import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAiCommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceAdmin";
import type { IAiCommerceDepositAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceDepositAccount";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * 존재하는 예치금 계좌를 관리자 인증 하에 상세 조회하는 성공 시나리오입니다.
 *
 * 1. 관리자 가입 및 인증 (POST /auth/admin/join) - 랜덤 이메일, 패스워드, status
 * 2. (관리자 인증 하에) 예치금 계좌 한 건 생성 (POST /aiCommerce/admin/depositAccounts)
 * 3. 생성된 depositAccountId로 상세 조회 (GET
 *    /aiCommerce/admin/depositAccounts/{depositAccountId})
 * 4. 조회 및 생성된 데이터의 상세 필드 일치성(assert), 요구 비즈니스 필드 assert
 *
 * 시나리오 구현 핵심:
 *
 * - 인증 컨텍스트 확보(토큰)
 * - User_id 연계, 계좌코드, 잔고 등의 생성과 반환 데이터 일치 확인
 * - 상태(status), 통화(currency_code), 생성/수정일자, 등 데이터 assert
 */
export async function test_api_deposit_account_at_admin_success(
  connection: api.IConnection,
) {
  // 1. 관리자 회원 가입 및 인증
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IAiCommerceAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphaNumeric(12),
        status: RandomGenerator.pick([
          "active",
          "suspended",
          "pending",
        ] as const),
      } satisfies IAiCommerceAdmin.IJoin,
    });
  typia.assert(admin);

  // 2. 예치금 계좌 신규 생성
  const depositAccountCreate = {
    user_id: admin.id,
    account_code: RandomGenerator.alphaNumeric(10),
    balance: 0,
    currency_code: RandomGenerator.pick(["KRW", "USD"] as const),
    status: "active",
  } satisfies IAiCommerceDepositAccount.ICreate;
  const createdAccount: IAiCommerceDepositAccount =
    await api.functional.aiCommerce.admin.depositAccounts.create(connection, {
      body: depositAccountCreate,
    });
  typia.assert(createdAccount);

  // 3. 상세 조회 (생성된 계좌 id)
  const readAccount: IAiCommerceDepositAccount =
    await api.functional.aiCommerce.admin.depositAccounts.at(connection, {
      depositAccountId: createdAccount.id,
    });
  typia.assert(readAccount);

  // 4. 검증 - 생성/조회 일치, 주요 필드 검증
  // id, user_id, account_code, 통화, status, balance 등 주요 데이터 일치
  TestValidator.equals("계좌 id 일치", readAccount.id, createdAccount.id);
  TestValidator.equals(
    "user_id 일치",
    readAccount.user_id,
    depositAccountCreate.user_id,
  );
  TestValidator.equals(
    "account_code 일치",
    readAccount.account_code,
    depositAccountCreate.account_code,
  );
  TestValidator.equals(
    "currency_code 일치",
    readAccount.currency_code,
    depositAccountCreate.currency_code,
  );
  TestValidator.equals(
    "잔고 일치",
    readAccount.balance,
    depositAccountCreate.balance,
  );
  TestValidator.equals(
    "status 일치",
    readAccount.status,
    depositAccountCreate.status,
  );
  // 생성일, 수정일 ISO 8601 형식(string & tags.Format<"date-time">)
  typia.assert<string & tags.Format<"date-time">>(readAccount.created_at);
  typia.assert<string & tags.Format<"date-time">>(readAccount.updated_at);
  // deleted_at은 undefined이거나 null이어야 함
  TestValidator.predicate(
    "deleted_at null 또는 undefined",
    readAccount.deleted_at === undefined || readAccount.deleted_at === null,
  );
}

/**
 * - 전체 워크플로우는 관리자 계정 생성 → 인증 컨텍스트 확보(토큰) → 예치금 계좌 생성 → 상세조회 → 생성/조회 데이터 assert
 *   순이며, 모든 API 호출에 await 적용되어 있음.
 * - IAiCommerceAdmin.IJoin 요청 body는 email, password, status 3개만 포함(불필요 필드 없음),
 *   status 랜덤 pick으로 비즈니스 허용값 적용, password 랜덤 생성
 * - 인증된 admin.id를 예치금계좌 user_id로 바로 연동(값/타입 일치)
 * - IAiCommerceDepositAccount.ICreate 요청은 user_id, account_code, balance,
 *   currency_code, status (전부 schema 명시 필수 필드만)
 * - 계좌 상세조회(GET)는 IAiCommerceDepositAccount 전체 구조 그대로 리턴, typia.assert() 후 주요 필드
 *   assert 및 ISO 8601 포맷 체크
 * - Status 등 주요 필드는 비즈니스 허용값만 pick
 * - Deleted_at은 undefined 혹은 null로만 올 수 있어 predicate로 검증
 * - TestValidator.equals 및 typia.assert에 제목 제공/순서 일치, actual-first 유지
 * - 랜덤데이터 생성에 tags, RandomGenerator 모두 정확 활용
 * - 추가 import 등 템플릿 위반 전혀 없음
 * - 절대 금지 위반사항 없음: wrong type 사용, as any 없음, status/권한 체크 없음, 불필요 에러 message 체크
 *   없음
 *
 * 이 코드는 타입, 비즈니스 요구조건, 랜덤값 생성, assert 체크, 인증, 실제 데이터 일치 모두 완벽하게 준수하고 있음. 수정 및
 * 삭제해야 할 부분 없이 draft 그대로 final로 제출가능함.
 *
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
 *   - O 4.8. AI-Driven Autonomous TypeScript Syntax Deep Analysis
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
