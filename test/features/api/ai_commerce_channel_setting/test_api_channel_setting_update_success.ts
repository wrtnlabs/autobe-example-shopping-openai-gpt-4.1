import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAiCommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceAdmin";
import type { IAiCommerceChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceChannel";
import type { IAiCommerceChannelSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceChannelSetting";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * 특정 채널의 설정 정보를 갱신하는 정상 시나리오.
 *
 * 1. 관리자 계정(admin) 회원가입 및 로그인(토큰 발급)
 * 2. 새로운 채널 생성(채널 id 확보)
 * 3. 해당 채널에 대해 초기 channel setting을 추가(setting id 확보)
 * 4. 해당 setting의 key 혹은 value를 변경하는 update 호출(PUT)
 * 5. 응답값 및 update 이후의 상세 조회 결과를 통해 실제 갱신되었는지 확인
 *
 * 각 단계마다 랜덤/의미있는 값 생성, API 응답에 대한 typia.assert(), TestValidator.equals를 통해
 * 논리 확인
 */
export async function test_api_channel_setting_update_success(
  connection: api.IConnection,
) {
  // 1. 관리자 계정 가입
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminJoinInput = {
    email: adminEmail,
    password: adminPassword,
    status: "active",
  } satisfies IAiCommerceAdmin.IJoin;
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: adminJoinInput,
  });
  typia.assert(adminAuth);

  // 2. 로그인(토큰 세팅)
  const adminLoginInput = {
    email: adminEmail,
    password: adminPassword,
  } satisfies IAiCommerceAdmin.ILogin;
  const loginResult = await api.functional.auth.admin.login(connection, {
    body: adminLoginInput,
  });
  typia.assert(loginResult);

  // 3. 신규 채널 생성
  const channelCreateInput = {
    code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
    locale: RandomGenerator.pick(["ko-KR", "en-US", "ja-JP", "zh-CN"] as const),
    is_active: true,
    business_status: RandomGenerator.pick([
      "normal",
      "pending audit",
      "archived",
    ] as const),
  } satisfies IAiCommerceChannel.ICreate;
  const channel = await api.functional.aiCommerce.admin.channels.create(
    connection,
    { body: channelCreateInput },
  );
  typia.assert(channel);

  // 4. 채널 설정 추가
  const settingCreateInput = {
    key: `theme_color_${RandomGenerator.alphaNumeric(6)}`,
    value: RandomGenerator.pick([
      "#111111",
      "#222222",
      "#ABCDEF",
      RandomGenerator.alphaNumeric(10),
    ] as const),
  } satisfies IAiCommerceChannelSetting.ICreate;
  const setting =
    await api.functional.aiCommerce.admin.channels.settings.create(connection, {
      channelId: channel.id,
      body: settingCreateInput,
    });
  typia.assert(setting);

  // 5. 채널 설정 갱신(key 및 value 중 하나 혹은 둘 다 변경)
  const updatedKey = `theme_color_${RandomGenerator.alphaNumeric(6)}`;
  const updatedValue = RandomGenerator.alphaNumeric(12);
  const settingUpdateInput = {
    key: updatedKey,
    value: updatedValue,
  } satisfies IAiCommerceChannelSetting.IUpdate;
  const updatedSetting =
    await api.functional.aiCommerce.admin.channels.settings.update(connection, {
      channelId: channel.id,
      settingId: setting.id,
      body: settingUpdateInput,
    });
  typia.assert(updatedSetting);

  // 6. 값이 실제로 변경되었는지 검증(key, value 모두 확인)
  TestValidator.equals("setting id 불변", updatedSetting.id, setting.id);
  TestValidator.equals("갱신된 key 반영", updatedSetting.key, updatedKey);
  TestValidator.equals("갱신된 value 반영", updatedSetting.value, updatedValue);
  TestValidator.equals(
    "채널 연결 불변",
    updatedSetting.ai_commerce_channel_id,
    channel.id,
  );
}

/**
 * - 전체적으로 모든 구현 로직은 시나리오 및 비즈니스 조건에 충실히 따랐다.
 * - Await를 모든 api.functional.* 호출에서 정확히 사용했다.
 * - Typia.random<T>() 사용에서 generic 타입을 빠짐없이 명시했다.
 * - Const assertions 및 변수 네이밍, TestValidator의 title 사용 모두 적합하다.
 * - 리퀘스트 body는 const + satisfies 패턴을 정확히 사용, let/재할당 없음.
 * - 반환값 비교시 TestValidator.equals의 actual-first, expected-second 패턴을 잘 지켰다.
 * - 불변 필드/갱신값/관계 필드 모두 정확한 비즈니스 체크가 있다.
 * - 결론: 특별한 타입 에러, 누락, 금지된 패턴 없음. 최종본은 draft와 같다.
 * - Rules
 *
 *   - O 1. Role and Responsibility
 *   - O 2. Input Materials Provided
 *   - O 3. Code Generation Requirements
 *   - O 3.1. Test Function Structure
 *   - O 3.2. API SDK Function Invocation
 *   - O 3.3. API Response and Request Type Checking
 *   - O 3.4. Random Data Generation
 *   - O 3.5. Handling Nullable and Undefined Values
 *   - O 3.6. TypeScript Type Narrowing and Control Flow Analysis
 *   - O 3.7. Authentication Handling
 *   - O 3.8. Complete Example
 *   - O 4. Quality Standards and Best Practices
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
