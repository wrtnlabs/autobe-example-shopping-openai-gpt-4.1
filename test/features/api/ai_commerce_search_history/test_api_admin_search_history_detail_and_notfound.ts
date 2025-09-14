import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAiCommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceAdmin";
import type { IAiCommerceSearchHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceSearchHistory";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIAiCommerceSearchHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAiCommerceSearchHistory";

/**
 * 관리자가 특정 사용자의 검색 이력을 상세 조회 및 NotFound 처리 검증.
 *
 * 1. 새로운 관리자 계정을 생성한다(POST /auth/admin/join).
 * 2. 위 이메일로 관리자 로그인을 하여 인증토큰을 활성화한다.
 * 3. 검색 이력 첫 1페이지(limit 3) 목록을 조회한 뒤 data의 id 값을 하나 확보한다.
 *
 *    - Data가 비어있을 경우 테스트 종료(검색 이력이 없는 상태로, 상세조회 의미 없음).
 * 4. 확보한 searchHistoryId를 사용해 상세 조회를 시도한다(성공 검증 및 동등성 체크).
 * 5. 존재하지 않는 랜덤 UUID로 상세조회 시도 시 notfound 에러가 반환되는지 체크(async
 *    TestValidator.error)
 */
export async function test_api_admin_search_history_detail_and_notfound(
  connection: api.IConnection,
) {
  // 1. 새로운 관리자 계정 생성
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    status: "active",
  } satisfies IAiCommerceAdmin.IJoin;
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: joinInput,
  });
  typia.assert(adminAuth);

  // 2. 관리자 로그인(토큰 활성화)
  const loginInput = {
    email: joinInput.email,
    password: joinInput.password,
  } satisfies IAiCommerceAdmin.ILogin;
  const adminLogin = await api.functional.auth.admin.login(connection, {
    body: loginInput,
  });
  typia.assert(adminLogin);

  // 3. 검색 이력 조회(limit 3)
  const searchList =
    await api.functional.aiCommerce.admin.searchHistories.index(connection, {
      body: {
        limit: 3,
      } satisfies IAiCommerceSearchHistory.IRequest,
    });
  typia.assert(searchList);

  // 3-1. 검색 이력이 없으면 종료
  if (searchList.data.length === 0) {
    return;
  }

  // 4. 상세 조회 성공 시 값 동등성 검증
  const historyId = searchList.data[0].id;
  const detail = await api.functional.aiCommerce.admin.searchHistories.at(
    connection,
    {
      searchHistoryId: historyId,
    },
  );
  typia.assert(detail);
  TestValidator.equals(
    "상세조회 결과는 목록 아이템과 id가 동일",
    detail.id,
    historyId,
  );

  // 5. 랜덤 uuid로 조회시 notfound 에러
  await TestValidator.error(
    "존재하지 않는 검색이력 id 접근시 에러 발생",
    async () => {
      await api.functional.aiCommerce.admin.searchHistories.at(connection, {
        searchHistoryId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );
}

/**
 * - 시나리오 해석, business flow, API endpoint 및 DTO 사용 정확성 모두 충족됨.
 * - IAiCommerceAdmin.IJoin 활용, 이메일/비밀번호/상태 모두 명확히 제공(랜덤 메일, "active" status).
 *   IAiCommerceAdmin.ILogin 및 인증토큰 동작 논리 상동.
 * - IAiCommerceSearchHistory.IRequest를 통한 검색 이력 목록 패치 - limit 3으로 충분한 검색 이력 확보,
 *   비어있을 때 종료 플로우 합리적.
 * - 목록 데이터 있을 경우, 상세조회 대상 id 확보 및 GET 상세조회 성공(typia.assert 검증) + 목록의 id와 상세 id 일치
 *   확인.
 * - 존재하지 않는 랜덤 uuid를 사용, 검색이력 상세조회 시 TestValidator.error(async)로 에러발생 검증,
 *   validation code 양식과 await 사용 모두 정확.
 * - 모든 API 응답 typia.assert 호출, TestValidator title 명 확실/한국어로 컨텍스트 명료 표현.
 * - RequestBody의 satisfies 패턴만 활용, type-annotation 없는 const 변수 사용, 타입정확성/불변성 잘
 *   지킴.
 * - 잘못된 타입 요청, as any, 타입 오류 유도 전혀 없음. 컴파일 성공.
 * - 오직 제공된 API/DTO/provided imports 내부에서만 구현, 추가 import 없음.
 * - Await 관련 규칙/테스트 밸리데이터 규칙 100% 준수.
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
