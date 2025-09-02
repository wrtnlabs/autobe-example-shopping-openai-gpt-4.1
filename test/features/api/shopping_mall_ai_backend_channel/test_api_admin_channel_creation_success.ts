import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendChannel";

export async function test_api_admin_channel_creation_success(
  connection: api.IConnection,
) {
  /**
   * 성공적인 관리자 판매채널 생성 플로우를 검증합니다.
   *
   * - 1. 관리자로 회원가입(자동 로그인)
   * - 2. 유효한 신규 판매채널 생성 요청
   * - 3. 응답 데이터와 입력값 일치 확인, 필수 필드 검증
   */

  // 1. 관리자 회원가입(자동 로그인)
  const adminJoinInput: IShoppingMallAiBackendAdmin.ICreate = {
    username: RandomGenerator.alphaNumeric(10),
    password_hash: RandomGenerator.alphaNumeric(32),
    name: RandomGenerator.name(),
    email: `${RandomGenerator.alphaNumeric(8)}@company.com`,
    phone_number: RandomGenerator.mobile(),
    is_active: true,
  };
  const adminAuth: IShoppingMallAiBackendAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinInput,
    });
  typia.assert(adminAuth);
  TestValidator.equals(
    "가입 후 관리자 이메일 일치",
    adminAuth.admin.email,
    adminJoinInput.email,
  );
  TestValidator.predicate(
    "관리자 활성 상태 true",
    adminAuth.admin.is_active === true,
  );
  TestValidator.predicate(
    "토큰 포함 여부",
    typeof adminAuth.token.access === "string" &&
      adminAuth.token.access.length > 0,
  );

  // 2. 신규 판매채널 등록(POST /shoppingMallAiBackend/admin/channels)
  const channelInput: IShoppingMallAiBackendChannel.ICreate = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    country: "KR",
    currency: "KRW",
    language: "ko-KR",
    timezone: "Asia/Seoul",
  };
  const created: IShoppingMallAiBackendChannel =
    await api.functional.shoppingMallAiBackend.admin.channels.create(
      connection,
      { body: channelInput },
    );
  typia.assert(created);
  TestValidator.equals("생성된 채널명 일치", created.name, channelInput.name);
  TestValidator.equals("채널 고유코드 일치", created.code, channelInput.code);
  TestValidator.equals(
    "설명 일치",
    created.description,
    channelInput.description,
  );
  TestValidator.equals("국가코드 일치", created.country, channelInput.country);
  TestValidator.equals(
    "통화코드 일치",
    created.currency,
    channelInput.currency,
  );
  TestValidator.equals("언어 일치", created.language, channelInput.language);
  TestValidator.equals("타임존 일치", created.timezone, channelInput.timezone);
  TestValidator.predicate(
    "생성일시 존재여부",
    typeof created.created_at === "string" && created.created_at.length > 0,
  );
  TestValidator.predicate(
    "수정일시 존재여부",
    typeof created.updated_at === "string" && created.updated_at.length > 0,
  );
  TestValidator.equals(
    "삭제일시는 null 또는 미포함",
    created.deleted_at ?? null,
    null,
  );
}
