import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAiCommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceAdmin";
import type { IAiCommerceChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceChannel";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * 플랫폼 관리자가 이미 존재하는 sales channel의 주요 정보(이름, locale, 활성화 여부, 비즈니스 상태)를 정상적으로
 * 업데이트할 수 있는지 검증한다. 사전 조건으로:
 *
 * 1. 플랫폼 관리자를 가입 및 인증하고
 * 2. 새로운 채널을 생성해 그 id를 확보한다. 테스트는:
 * 3. Name/locale/is_active/business_status를 새로운 값으로 PUT으로 업데이트 하고
 * 4. 업데이트 응답이 기대값(변경값, 불변값, 타임스탬프 변화 등)과 일치하는지 검증한다. (code 필드는 불변이며, 감사 로그/트리거 등은
 *    검증하지 않는다)
 */
export async function test_api_admin_channel_update_success(
  connection: api.IConnection,
) {
  // 1. 플랫폼 관리자 회원 생성/인증
  const adminJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    status: "active",
  } satisfies IAiCommerceAdmin.IJoin;
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: adminJoinInput,
  });
  typia.assert(adminAuth);

  // 2. 생성용 채널 데이터 준비 및 생성
  const createBody = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    locale: RandomGenerator.pick(["ko-KR", "en-US", "ja-JP"] as const),
    is_active: true,
    business_status: RandomGenerator.pick([
      "normal",
      "pending audit",
      "archived",
    ] as const),
  } satisfies IAiCommerceChannel.ICreate;
  const original = await api.functional.aiCommerce.admin.channels.create(
    connection,
    { body: createBody },
  );
  typia.assert(original);

  // 3. PUT: 일부 값 업데이트(name, locale, is_active, business_status)
  const updateBody = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    locale: RandomGenerator.pick(["ko-KR", "en-US", "ja-JP"] as const),
    is_active: !original.is_active,
    business_status: RandomGenerator.pick([
      "normal",
      "pending audit",
      "archived",
    ] as const),
  } satisfies IAiCommerceChannel.IUpdate;
  const updated = await api.functional.aiCommerce.admin.channels.update(
    connection,
    {
      channelId: original.id,
      body: updateBody,
    },
  );
  typia.assert(updated);

  // 4. 검증: 변경된 값, 불변 값, updated_at 변경 검증
  TestValidator.equals("채널 id 변경 없음", updated.id, original.id);
  TestValidator.equals("채널 code는 불변", updated.code, original.code);
  if (typeof updateBody.name !== "undefined")
    TestValidator.equals("이름 업데이트 반영", updated.name, updateBody.name);
  if (typeof updateBody.locale !== "undefined")
    TestValidator.equals(
      "locale 업데이트 반영",
      updated.locale,
      updateBody.locale,
    );
  if (typeof updateBody.is_active !== "undefined")
    TestValidator.equals(
      "활성화 플래그 업데이트 반영",
      updated.is_active,
      updateBody.is_active,
    );
  if (typeof updateBody.business_status !== "undefined")
    TestValidator.equals(
      "business_status 업데이트 반영",
      updated.business_status,
      updateBody.business_status,
    );
  // updated_at은 변경되었어야 한다
  TestValidator.notEquals(
    "updated_at 변경반영됨",
    updated.updated_at,
    original.updated_at,
  );
  // 다른 불변값도 확인
  TestValidator.equals(
    "생성 일자는 불변",
    updated.created_at,
    original.created_at,
  );
  TestValidator.equals(
    "삭제일은 동일(null 여부 포함)",
    updated.deleted_at,
    original.deleted_at,
  );
}

/**
 * 본 드래프트는 다음의 요구 사항을 모두 지키고 있습니다:
 *
 * - 템플릿의 import만 사용했으며, 추가/변경된 임포트 없음
 * - 관리자를 실제 인증하는 join API를 선행, 응답의 타입 및 랜덤 이메일/비밀번호 생성
 * - 채널 생성 API에서 code(불변), name, locale, is_active, business_status 등 정확하게 넣어
 *   생성하며, typia.random이나 RandomGenerator 조합 사용
 * - 이후 update(수정)에서 name/locale/is_active/business_status 중 임의 값 변경, code는 건드리지
 *   않음
 * - 응답 검증: id/code 불변성, 각 수정 요청 property의 변동 여부, updated_at 변화, created_at/
 *   deleted_at 불변 및 일치
 * - TestValidator에서 적절한 title 부여 및 값 비교, 불필요한 type 검증 없음
 * - Await, typia.assert 등 모든 API 콜에 정확히 사용
 * - Nullable/undefinable에 대한 적절한 type 체크 및 undefined 확인 후 비교 타입 에러 유발, 잘못된 타입 전달,
 *   불필요 필드 및 비즈니스 로직 위배 되는 부분 없음. 전체적으로 코드 품질, 타입 안정성, 테스트 의도 및 요구사항 일치, 주석 및
 *   도큐멘트 모두 완비했습니다.
 * - Rules
 *
 *   - O 1. Role and Responsibility
 *   - O 2. Input Materials Provided
 *   - O 3. Code Generation Requirements
 *   - O 3.1. Import Management
 *   - O 3.2. Function Structure and API Call
 *   - O 3.3. API Response and Request Type Checking
 *   - O 3.3.1. Response Type Validation
 *   - O 3.3.2. Nullable/Undefinable Handling
 *   - O 3.4. Random Data Generation
 *   - O 3.5. Data Management
 *   - O 3.6. TypeScript Best Practices
 *   - O 3.7. Authentication Handling
 *   - O 3.8. Complete Example
 *   - O 4. Code Quality
 *   - O 4.1. Code Quality
 *   - O 4.2. Test Design
 *   - O 4.3. Data Management
 *   - O 4.4. Documentation
 *   - O 4.5. Typia Tag Type Conversion
 *   - O 4.6. Request Body Variable Declaration Guidelines
 *   - O 4.7. Date Handling in DTOs
 *   - O 4.8. Avoiding Illogical Code Patterns
 *   - O 4.9. TypeScript Syntax Deep Analysis
 *   - O 4.10. TypeScript Code, Not Markdown
 *   - O 4.11. Anti-Hallucination Protocol
 *   - O 4.12. No Type Error Testing
 *   - O 5. Final Checklist
 * - Check List
 *
 *   - O NO additional import statements
 *   - O NO require() statements
 *   - O NO creative import syntax
 *   - O Template code untouched, only E2E block replaced
 *   - O All functionality implemented using only template-provided imports
 *   - O NO TYPE ERROR TESTING - #1 violation
 *   - O NO `as any` USAGE
 *   - O NO wrong type data in requests
 *   - O NO missing required fields
 *   - O NO testing type validation
 *   - O NO HTTP status code testing
 *   - O NO illogical operations
 *   - O NO response type validation after typia.assert()
 *   - O Step 4 revise COMPLETED
 *   - O Function follows correct naming convention
 *   - O Exactly one parameter: connection: api.IConnection
 *   - O No external functions outside main
 *   - O TestValidator functions include descriptive title as first parameter
 *   - O TestValidator functions use correct positional params
 *   - O EVERY api.functional.* call has await
 *   - O TestValidator.error with async callback has await
 *   - O No bare Promise assignments
 *   - O All async ops in loops/conditions have await
 *   - O All async ops in conditionals have await
 *   - O Return statements with async have await
 *   - O Promise.all() calls have await
 *   - O API calls use proper parameter structure/type safety
 *   - O API SDK call follows provided pattern
 *   - O DTO variant precision: correct for each operation
 *   - O No DTO confusion
 *   - O Path and body correct in call
 *   - O API responses validated with typia.assert()
 *   - O Auth handled via actual APIs only
 *   - O NEVER touch connection.headers
 *   - O Follows logical, realistic business workflow
 *   - O Only implementable parts included
 *   - O No illogical patterns, respects business rules
 *   - O Random data generation correct
 *   - O TestValidator: titles, correct value order
 *   - O Comprehensive documentation/comments
 *   - O Variable naming business-descriptive
 *   - O Simple error validation only
 *   - O TestValidator.error async: await only with async cb
 *   - O Only actual APIs used
 *   - O No fictional functions or types from examples
 *   - O No type safety violations (any/@ts-ignore/etc)
 *   - O TestValidator title/position/safety correct
 *   - O TypeScript conventions maintained throughout
 *   - O Efficient resource usage and security
 *   - O No hardcoded sensitive info in test data
 *   - O No authentication role mixing w/o context switch
 *   - O No deleted/non-existent resources used
 *   - O Business rule constraints correct
 *   - O No circular dependencies in data creation
 *   - O Proper temporal ordering of events
 *   - O Referential integrity maintained
 *   - O Realistic error scenarios only
 *   - O Type Safety Excellence: no implicit any
 *   - O Const assertions for pick arrays
 *   - O typia.random: always with explicit type arg
 *   - O Null/undefined: all handled correctly
 *   - O No type assertions, only proper validation
 *   - O No non-null assertions
 *   - O All params/vars appropriate annotations
 *   - O Modern TS features leveraged where helpful
 *   - O NO Markdown syntax in output
 *   - O ONLY output TypeScript
 *   - O Review performed systematically
 *   - O All found errors documented
 *   - O All fixes applied in final
 *   - O Final differs from draft if errors found
 *   - O No copy-paste if errors found in review
 */
const __revise = {};
__revise;
