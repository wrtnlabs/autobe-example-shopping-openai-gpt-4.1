import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendCodebook } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCodebook";

/**
 * 관리자 코드북 생성 실패 및 유효성 검증 테스트
 *
 * 1. 관리자로 회원가입(인증) 후 토큰 획득
 * 2. 필수값(code, name) 누락 또는 비어있는 등 유효하지 않은 페이로드로 코드북 생성 API 호출 시도
 *
 *    - Code, name이 모두 누락된 경우
 *    - Code만 누락된 경우
 *    - Name만 누락된 경우
 *    - Code 또는 name에 빈 문자열 전달
 *    - Description만 단독 전달
 *    - 타입 위반(숫자 등)
 * 3. 각 잘못된 요청마다 응답이 에러(400/BAD REQUEST 등)로 나오고, 실제 코드북 생성에 실패함을 검증
 * 4. (옵션) 정상 페이로드 입력 시 생성 성공도 함께 확인 가능
 */
export async function test_api_admin_codebook_creation_invalid_payload_failure(
  connection: api.IConnection,
) {
  // 1. 관리자로 회원가입/인증
  const adminInput = {
    username: RandomGenerator.alphabets(8),
    password_hash: RandomGenerator.alphaNumeric(16),
    name: RandomGenerator.name(),
    email: `${RandomGenerator.alphabets(6)}@company.com`,
    is_active: true,
  } satisfies IShoppingMallAiBackendAdmin.ICreate;
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: adminInput,
  });
  typia.assert(adminAuth);

  // 2. invalid payload 케이스 제작
  const invalidPayloads: IShoppingMallAiBackendCodebook.ICreate[] = [
    // code, name 모두 누락 (빈 객체)
    {} as any,
    // code 누락
    {
      name: RandomGenerator.name(),
    } as any,
    // name 누락
    {
      code: RandomGenerator.alphaNumeric(8),
    } as any,
    // code 빈 문자열
    {
      code: "",
      name: RandomGenerator.name(),
    },
    // name 빈 문자열
    {
      code: RandomGenerator.alphaNumeric(8),
      name: "",
    },
    // description만 단독
    {
      description: RandomGenerator.paragraph(),
    } as any,
    // 타입 위반(code: number)
    {
      code: 12345 as any,
      name: RandomGenerator.name(),
    } as any,
  ];

  // 3. 각각의 invalid 케이스에 대해 API 호출 시도: 반드시 에러 발생해야 함
  for (const [idx, payload] of invalidPayloads.entries()) {
    await TestValidator.error(
      `[케이스 ${idx + 1}] 잘못된 코드북 생성 페이로드는 에러를 반환해야 한다`,
      async () => {
        await api.functional.shoppingMallAiBackend.admin.codebooks.create(
          connection,
          {
            body: payload,
          },
        );
      },
    );
  }

  // 4. 정상 페이로드 성공도 함께 검증 (정상 입력 시 오류 없이 생성되어야 함)
  const validPayload: IShoppingMallAiBackendCodebook.ICreate = {
    code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph(),
  };
  const created =
    await api.functional.shoppingMallAiBackend.admin.codebooks.create(
      connection,
      {
        body: validPayload,
      },
    );
  typia.assert(created);
  TestValidator.equals(
    "정상 요청 시 생성된 코드북 code가 일치해야 한다",
    created.code,
    validPayload.code,
  );
  TestValidator.equals(
    "정상 요청 시 생성된 코드북 name이 일치해야 한다",
    created.name,
    validPayload.name,
  );
}
