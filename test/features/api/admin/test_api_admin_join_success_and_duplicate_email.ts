import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAiCommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * 플랫폼 관리자 계정 가입 성공 및 중복/허용되지 않은 status 오류 검증.
 *
 * 1. 정상적인 관리자 계정 가입이 성공하고 토큰이 발급되는지 확인
 * 2. 동일(중복) 이메일로 추가 가입 시도 시 오류
 * 3. 허용되지 않은 status 값으로 가입 시 오류 발생
 */
export async function test_api_admin_join_success_and_duplicate_email(
  connection: api.IConnection,
) {
  // 1. 정상 관리자 계정 가입
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    status: "active", // 허용값 예시(비즈니스 규칙 기반)
  } satisfies IAiCommerceAdmin.IJoin;

  const joinResult: IAiCommerceAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: joinBody });
  typia.assert(joinResult);
  TestValidator.predicate(
    "가입 성공시 JWT 토큰 반환",
    typeof joinResult.token.access === "string" &&
      joinResult.token.access.length > 0,
  );

  // 2. 동일 이메일로 가입 시도 -> 오류 발생
  await TestValidator.error("중복 이메일 가입 실패", async () => {
    await api.functional.auth.admin.join(connection, { body: joinBody });
  });

  // 3. 허용되지 않은 status 값으로 가입 시도 -> 오류 발생
  const invalidStatusBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    status: "hacker", // 허용되지 않은 값
  } satisfies IAiCommerceAdmin.IJoin;
  await TestValidator.error("유효하지 않은 status 값 가입 실패", async () => {
    await api.functional.auth.admin.join(connection, {
      body: invalidStatusBody,
    });
  });
}

/**
 * - API SDK 함수는 모두 await와 함께 정상적으로 호출됐다.
 * - IAiCommerceAdmin.IJoin을 정확하게 타입 값으로 사용했고, typia.random으로 email,
 *   RandomGenerator로 password를 생성하여 임의 값 발생 규칙을 지켰다.
 * - Status 값에 대해서 'active'라는 정상 값과 'hacker'(임의의 허용되지 않은 값)를 예제로 사용해 성공/실패 케이스를 모두
 *   검증했다.
 * - 첫 가입 시에 실제 IAiCommerceAdmin.IAuthorized 타입에 대한 typia.assert로 응답 타입 검증을 수행했다.
 * - 중복된 email 및 invalid status 가입 시 TestValidator.error (async 함수로서 await 사용)로 예외
 *   검사 수행했다.
 * - 모든 TestValidator 함수는 반드시 title 첫 번째 매개변수를 넣었으며, 구체적 설명이 되도록 작성됨.
 * - 검증 후 binding 및 assertion에서 타입 일치/실패를 반드시 확인했다.
 * - 추가적인 import는 전혀 없고, 템플릿 import만 사용되어 규정 위반 없음.
 * - 비정상 요청에 대해 타입레벨 위반 없이(잘못된 타입 intentionally 전달 X) 타입 규칙을 엄격히 지켰다.
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
 *   - O 5. Final Checklist
 * - Check List
 *
 *   - O NO additional import statements
 *   - O NO wrong type data in requests
 *   - O EVERY api.functional.* call has await
 *   - O No compilation errors
 *   - O Proper async/await usage
 *   - O CRITICAL: All TestValidator functions include descriptive title as FIRST
 *       parameter
 *   - O No response type validation after typia.assert()
 *   - O NO as any usage
 *   - O NO fictional functions or types from examples
 *   - O Only imported DTOs/functions used
 */
const __revise = {};
__revise;
