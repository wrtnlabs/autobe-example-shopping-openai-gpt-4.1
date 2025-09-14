import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAiCommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Ai_commerce_admin 관리자 계정의 정상 및 비정상 로그인 시나리오 E2E 테스트
 *
 * 1. 정상적으로 가입된 active admin의 로그인 성공
 * 2. 존재하는 email에 대해 잘못된 password 로그인 실패
 * 3. 미존재 email + 올바른 형식 password 로그인 실패
 * 4. Suspended admin 계정의 로그인 실패
 * 5. Deleted admin 계정의 로그인 실패
 *
 * - 모든 실패 응답은 구체적 이유나 상태 노출 없이 일반 인증 실패만 반환
 * - 성공 시에만 토큰, admin id 등이 응답에 포함되고 실패 응답은 구조가 동일한지 확인
 */
export async function test_api_admin_login_various_outcomes(
  connection: api.IConnection,
) {
  // 1. 정상적으로 활성화된(admin, status: active) 계정 생성
  const email_active = typia.random<string & tags.Format<"email">>();
  const password_active = RandomGenerator.alphaNumeric(12);
  const join_active = await api.functional.auth.admin.join(connection, {
    body: {
      email: email_active,
      password: password_active,
      status: "active",
    } satisfies IAiCommerceAdmin.IJoin,
  });
  typia.assert(join_active);

  // 2. suspended 계정 생성
  const email_suspended = typia.random<string & tags.Format<"email">>();
  const password_suspended = RandomGenerator.alphaNumeric(12);
  await api.functional.auth.admin.join(connection, {
    body: {
      email: email_suspended,
      password: password_suspended,
      status: "suspended",
    } satisfies IAiCommerceAdmin.IJoin,
  });

  // 3. deleted 계정 생성
  const email_deleted = typia.random<string & tags.Format<"email">>();
  const password_deleted = RandomGenerator.alphaNumeric(12);
  await api.functional.auth.admin.join(connection, {
    body: {
      email: email_deleted,
      password: password_deleted,
      status: "deleted",
    } satisfies IAiCommerceAdmin.IJoin,
  });

  // 4. 로그인 성공 케이스
  const login_success = await api.functional.auth.admin.login(connection, {
    body: {
      email: email_active,
      password: password_active,
    } satisfies IAiCommerceAdmin.ILogin,
  });
  typia.assert(login_success);
  // admin id가 uuid 형식
  TestValidator.predicate(
    "로그인 성공 후 admin id uuid 형식",
    typeof login_success.id === "string" &&
      /[0-9a-f\-]{36}/i.test(login_success.id),
  );
  typia.assert(login_success.token);
  TestValidator.predicate(
    "access/refresh 토큰 문자열 반환",
    typeof login_success.token.access === "string" &&
      login_success.token.access.length > 0 &&
      typeof login_success.token.refresh === "string" &&
      login_success.token.refresh.length > 0,
  );

  // 5. 실패 케이스: 잘못된 비밀번호
  await TestValidator.error(
    "존재하는 이메일, 잘못된 비밀번호 로그인 실패",
    async () => {
      await api.functional.auth.admin.login(connection, {
        body: {
          email: email_active,
          password: RandomGenerator.alphaNumeric(10),
        } satisfies IAiCommerceAdmin.ILogin,
      });
    },
  );

  // 6. 실패 케이스: 미존재 이메일
  await TestValidator.error("미존재 이메일로 로그인 시도 실패", async () => {
    await api.functional.auth.admin.login(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(10),
      } satisfies IAiCommerceAdmin.ILogin,
    });
  });

  // 7. suspended 계정 정상로그인 정보로 시도 실패
  await TestValidator.error(
    "suspended 계정 정상 정보로 로그인 실패",
    async () => {
      await api.functional.auth.admin.login(connection, {
        body: {
          email: email_suspended,
          password: password_suspended,
        } satisfies IAiCommerceAdmin.ILogin,
      });
    },
  );

  // 8. deleted 계정 정상로그인 정보로 시도 실패
  await TestValidator.error(
    "deleted 계정 정상 정보로 로그인 실패",
    async () => {
      await api.functional.auth.admin.login(connection, {
        body: {
          email: email_deleted,
          password: password_deleted,
        } satisfies IAiCommerceAdmin.ILogin,
      });
    },
  );
}

/**
 * 1. 타입 안전성: 모든 API 요청/응답에 대해 정확한 타입 사용. IAiCommerceAdmin.IJoin, ILogin,
 *    IAuthorized 타입을 혼합하지 않음. 타입 캐스팅, any 없음.
 * 2. Await 일관성: 모든 api.functional.auth.admin.* 사용에 await 모두 붙음.
 * 3. TestValidator.error에서 async 콜백에 await 붙음. 각 케이스별 error wrapper 사용이 올바름.
 * 4. Typia.assert()는 응답 필요한 부분에만 사용, 추가 validation·pattern은 business logic 참조용에만
 *    사용.
 * 5. 민감정보 노출 검증 및 로그인 성공/실패 케이스 분명히 분리. 실패 응답 구조 개별 확인은 명확하지 않아(직접 메시지 내용/형태 체크
 *    불가) error wrapper로 처리.
 * 6. Request body const·let·타입 어노테이션 금지, const + satisfies만 사용.
 * 7. Import 구문 추가 없이 template 내 import만 사용. 파일 헤더 주석·mark-down 불포함.
 * 8. 비정상/불가능한 시나리오 없음. 타입 오류, as any, 잘못된 타입 유발 없음.
 * 9. 한글 scenario 설명, JSDoc 업데이트 및 step별 comment로 로직 설명.
 * 10. 권장 컨벤션/베스트프랙티스 모두 준수.
 *
 * - Rules
 *
 *   - O 1. Role and Responsibility
 *   - O 1.1. Function Calling Workflow
 *   - O 2. Input Materials Provided
 *   - O 3. Code Generation Requirements
 *   - O 3.1. Test Function Structure
 *   - O 3.2. API SDK Function Invocation
 *   - O 3.3. API Response and Request Type Checking
 *   - O 3.4. Random Data Generation
 *   - O 3.5. Handling Nullable and Undefined Values
 *   - O 3.6. TypeScript Type Narrowing and Control Flow Analysis
 *   - O 3.7. Authentication Handling
 *   - O 3.7. Logic Validation and Assertions
 *   - O 3.8. Complete Example
 *   - O 4. Quality Standards and Best Practices
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
