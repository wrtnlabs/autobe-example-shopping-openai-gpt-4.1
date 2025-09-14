import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAiCommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceAdmin";
import type { IAiCommerceChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceChannel";
import type { IAiCommerceChannelSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceChannelSetting";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * 존재하지 않는 settingId로 채널 설정 수정 시 에러 반환 검증
 *
 * 1. 관리자를 회원가입하여 인증을 세팅한다.
 * 2. 관리자 계정으로 로그인한다.
 * 3. 정상적인 채널을 생성한다.
 * 4. 해당 채널 id는 유효하나, 존재하지 않는 랜덤 uuid를 settingId값으로 넣어서 update API(put)를 호출한다.
 * 5. 요청 body는 정상적인 형식으로(랜덤/필수 필드 포함) 전송해야 하며, 단 settingId만 잘못되어 오류가 발생하여야 한다.
 * 6. 결과적으로 반드시 NotFound 혹은 그에 준하는 오류가 발생하는지 TestValidator.error로 검증한다.
 */
export async function test_api_channel_setting_update_id_not_found_error(
  connection: api.IConnection,
) {
  // 1. 관리자를 회원가입하여 인증 상태를 생성
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "test1234";
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      status: "active",
    } satisfies IAiCommerceAdmin.IJoin,
  });
  typia.assert(adminJoin);

  // 2. 관리자 계정으로 로그인
  const login = await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IAiCommerceAdmin.ILogin,
  });
  typia.assert(login);

  // 3. 정상적인 채널을 생성
  const channel = await api.functional.aiCommerce.admin.channels.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(),
        locale: "ko-KR",
        is_active: true,
        business_status: "normal",
      } satisfies IAiCommerceChannel.ICreate,
    },
  );
  typia.assert(channel);

  // 4. 유효한 channel id에 대해 존재하지 않는 settingId로 수정 요청
  const nonExistingSettingId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "존재하지 않는 settingId로 수정 요청시 NotFound 오류 발생",
    async () => {
      await api.functional.aiCommerce.admin.channels.settings.update(
        connection,
        {
          channelId: channel.id,
          settingId: nonExistingSettingId,
          body: {
            key: RandomGenerator.alphabets(6),
            value: RandomGenerator.alphabets(10),
          } satisfies IAiCommerceChannelSetting.IUpdate,
        },
      );
    },
  );
}

/**
 * - 올바른 시나리오 설명 및 코드 작성(존재하지 않는 settingId 오류 테스트)
 * - 모든 API 함수(회원가입, 로그인, 채널 생성)에 await이 올바르게 사용됨
 * - TestValidator.error 사용에서 await 및 타이틀 파라미터 포함 확인 (비동기 콜백)
 * - 랜덤 UUID (존재하지 않는 settingId) 사용으로 실제 존재하지 않는 리소스 테스트 가능
 * - 요청 body는 정상적, 타입/필수 항목 일치 및 satisfies 사용
 * - 실존하는 API & DTO만 사용, 예제거나 허구 타입 없음
 * - Import 추가/변경 없이 템플릿 내에서만 작성
 * - Typia.assert 적합하게 사용, API 응답에 대해 추가 type validation 하지 않음
 * - 타입/컴파일 오류 유발 로직 없음 (as any 등 없음)
 * - 코드, 주석, 변수명 모두 업무 맥락, 시나리오 설명 반영
 * - 오류 체크 외 추가적인 404 등 HTTP status code 체크, 메시지 검사 등 불필요한 로직 없음
 * - Assertion 함수 타이틀, 파라미터 포지션 모두 체크 오류 없음, 양호.
 * - Rules
 *
 *   - O 1. Role and Responsibility
 *   - O 2. Input Materials Provided
 *   - O 3. Code Generation Requirements
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
 *   - O NO `as any` USAGE
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
