import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendChannel";
import type { IShoppingMallAiBackendChannelCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendChannelCategory";

export async function test_api_admin_channel_category_retrieve_success(
  connection: api.IConnection,
) {
  /**
   * 관리자 인증 후 특정 채널 내 카테고리 상세 정보 조회 성공 시나리오
   *
   * 1. 관리자(admin) 계정 생성 및 인증
   * 2. Admin 권한으로 채널 생성
   * 3. 생성 채널에 카테고리 등록 (루트 카테고리)
   * 4. 해당 채테고리 상세정보를 GET으로 조회
   * 5. 응답 구조와 값이 카테고리 생성 입력값, 참조 데이터와 정확히 일치하는지 검증
   *
   * - 관리자 인증이 없으면(즉, 토큰 없으면) API 호출이 실패해야 하지만 본 시나리오는 성공 케이스만 다룸
   * - 채널/카테고리 등 생성 로직 후 실제로 저장된 데이터와 GET 결과의 구조, 값(코드, 이름, 설명, parent_id 등)이
   *   일치하는지 모두 확인함
   * - UUID, date타입, null 허용 필드 등 포맷도 별도 검증
   */
  // 1. 관리자(admin) 계정 및 인증 토큰 생성
  const adminUsername = RandomGenerator.alphabets(10);
  const adminEmail = `${RandomGenerator.alphabets(5)}@company.com`;
  const adminPasswordHash = RandomGenerator.alphaNumeric(32);
  const adminJoinInput = {
    username: adminUsername,
    password_hash: adminPasswordHash,
    name: RandomGenerator.name(),
    email: adminEmail,
    is_active: true,
    phone_number: RandomGenerator.mobile(),
  } satisfies IShoppingMallAiBackendAdmin.ICreate;
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: adminJoinInput,
  });
  typia.assert(adminAuth);

  // 2. 채널 생성 (관리자 context 유지)
  const channelInput = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(),
    country: "KR",
    currency: "KRW",
    language: "ko",
    timezone: "Asia/Seoul",
    description: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IShoppingMallAiBackendChannel.ICreate;
  const channel =
    await api.functional.shoppingMallAiBackend.admin.channels.create(
      connection,
      { body: channelInput },
    );
  typia.assert(channel);

  // 3. 카테고리 생성 (해당 채널 내, 루트 레벨)
  const categoryInput = {
    shopping_mall_ai_backend_channel_id: channel.id,
    code: RandomGenerator.alphaNumeric(6),
    name: RandomGenerator.name(2),
    order: 1,
    description: RandomGenerator.paragraph({ sentences: 1 }),
    parent_id: null,
  } satisfies IShoppingMallAiBackendChannelCategory.ICreate;
  const category =
    await api.functional.shoppingMallAiBackend.admin.channels.categories.create(
      connection,
      {
        channelId: channel.id,
        body: categoryInput,
      },
    );
  typia.assert(category);

  // 4. 카테고리 상세 조회
  const detail =
    await api.functional.shoppingMallAiBackend.admin.channels.categories.at(
      connection,
      {
        channelId: channel.id,
        categoryId: category.id,
      },
    );
  typia.assert(detail);

  // 5. 생성 입력값 vs 상세조회 응답값 구조/데이터 동등성 검증
  TestValidator.equals("카테고리 코드 일치", detail.code, categoryInput.code);
  TestValidator.equals("카테고리 이름 일치", detail.name, categoryInput.name);
  TestValidator.equals(
    "카테고리 설명 일치",
    detail.description,
    categoryInput.description,
  );
  TestValidator.equals(
    "채널 ID 일치",
    detail.shopping_mall_ai_backend_channel_id,
    channel.id,
  );
  TestValidator.equals(
    "카테고리 정렬순서 일치",
    detail.order,
    categoryInput.order,
  );
  TestValidator.equals("카테고리 parent_id 루트(NULL)", detail.parent_id, null);
  TestValidator.predicate(
    "카테고리 UUID 형식 검증",
    typeof detail.id === "string" && detail.id.length > 0,
  );
  TestValidator.predicate(
    "생성/수정일시 형식 검증",
    typeof detail.created_at === "string" &&
      typeof detail.updated_at === "string",
  );
}
