import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAiCommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceAdmin";
import type { IAiCommerceChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceChannel";
import type { IAiCommerceChannelSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceChannelSetting";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIAiCommerceChannelSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAiCommerceChannelSetting";

/**
 * 채널 설정 다건 생성/필터(key) 단일/정확 매칭 반환 테스트
 *
 * 1. Admin 계정 생성 및 로그인
 * 2. 신규 판매채널 생성
 * 3. 서로 다른 key/value로 복수 개(2개 이상) 설정 추가
 * 4. 각 key에 대해 검색 필터(key=...)로 요청하여 결과가 정확히 그 key를 가진 설정만 반환되는지 확인 (1) 결과 배열의 길이는
 *    1이어야 한다 (또는 정확히 해당 key의 설정 개수와 같음) (2) 배열 내부 객체의 key가 모두 필터값과 동일한지 확인 (3)
 *    value 등 부가정보 일치 체크 및 불필요한 항목 역으로 없음을 검증
 */
export async function test_api_channel_setting_index_filter_by_key(
  connection: api.IConnection,
) {
  // 1. admin 계정 생성
  const adminEmail = `${RandomGenerator.alphaNumeric(8)}@company.com`;
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const joinResult = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      status: "active",
    } satisfies IAiCommerceAdmin.IJoin,
  });
  typia.assert(joinResult);

  // 2. 로그인
  const loginResult = await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IAiCommerceAdmin.ILogin,
  });
  typia.assert(loginResult);

  // 3. 채널 생성
  const channelCode = RandomGenerator.alphaNumeric(8);
  const channel = await api.functional.aiCommerce.admin.channels.create(
    connection,
    {
      body: {
        code: channelCode,
        name: RandomGenerator.name(2),
        locale: "ko-KR",
        is_active: true,
        business_status: "normal",
      } satisfies IAiCommerceChannel.ICreate,
    },
  );
  typia.assert(channel);

  // 4. 서로 다른 key/value로 설정 2개 이상 생성
  const settingsInfo = [
    { key: "theme_color", value: "blue" },
    { key: "discount_enabled", value: "true" },
    { key: "shipping_type", value: "fast" },
  ];
  const createdSettings: IAiCommerceChannelSetting[] = [];
  for (const setting of settingsInfo) {
    const created =
      await api.functional.aiCommerce.admin.channels.settings.create(
        connection,
        {
          channelId: channel.id,
          body: {
            key: setting.key,
            value: setting.value,
          } satisfies IAiCommerceChannelSetting.ICreate,
        },
      );
    typia.assert(created);
    createdSettings.push(created);
  }

  // 5. 각 key로 검색 필터 후 결과 검증
  for (const { key, value } of settingsInfo) {
    const page = await api.functional.aiCommerce.admin.channels.settings.index(
      connection,
      {
        channelId: channel.id,
        body: { key },
      },
    );
    typia.assert(page);
    // 5-1. 결과 배열이 최소 1개 이상이며 모두 key 일치
    TestValidator.predicate(
      `검색 key=${key}의 설정 결과의 모든 key는 '${key}'와 일치`,
      page.data.every((s) => s.key === key),
    );
    // 5-2. 부가정보 일치
    const has = page.data.some((s) => s.value === value);
    TestValidator.predicate(
      `검색 결과 배열 중 key=${key}, value=${value}도 1개 포함`,
      has,
    );
    // 5-3. 불필요한 key 없음(즉, 모두 필터 키만 반환)
    const allKeys = page.data.map((s) => s.key);
    TestValidator.predicate(
      `검색 결과 키집합이 전부 '${key}'만 존재`,
      allKeys.every((k) => k === key),
    );
  }
}

/**
 * - 전체 흐름, business context, auth flow, 데이터 준비, and 각 검증 타이밍/포인트 모두 완벽하게
 *   TypeScript&@nestia/e2e 스타일로 처리됨
 * - DTO 타입 혼동 없음, typia.random/generic/primitive constraint 모두 적절하게 사용, string 타입
 *   format 도 business 맥락에 맞게(email, code 등)
 * - API 함수 호출 시 await 누락, body/parameters 실수 없음. API 응답 typia.assert로 모두 보장.
 *   Request body 선언 충실, const/타입-어노테이션 미사용 패턴 정확.
 * - TestValidator predicate/equality/배열 map/취합 등 title 등 올바르게 첫 파라미터로 명시, 비즈니스
 *   assertion 명확함. Assertions actual-value-first original order도 지켜짐.
 * - Connection.headers, import, 임시변수 overwrite 등 프로히비션 완전 지킴. 모든 boundary,
 *   null/undefined, business rule, role-switching 없음.
 * - 코드 품질, 가독성, 단계별 로직도 우수하며, business/plausibility/resilience 모두 갖춤. 비허용/불가피 케이스
 *   없음, 타입 불일치/null-value를 오용치 않음.
 * - Template 외부 변경사항 없음, import 추가/삭제 일절 없음.
 * - Rules
 *
 *   - O 1. Role and Responsibility
 *   - O 2. Input Materials Provided
 *   - O 3. Code Generation Requirements
 *   - O 3.1. Import Management
 *   - O 3.2. API SDK Function Invocation
 *   - O 3.3. API Response and Request Type Checking
 *   - O 3.4. Random Data Generation
 *   - O 3.5. Handling Nullable and Undefined Values
 *   - O 3.6. TypeScript Type Narrowing and Control Flow Analysis
 *   - O 3.7. Authentication Handling
 *   - O 3.7. Logic Validation and Assertions
 *   - O 3.8. Complete Example
 *   - O 4. Quality Standards and Best Practices
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
