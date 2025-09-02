import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendChannel";
import type { IShoppingMallAiBackendChannelCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendChannelCategory";

/**
 * 관리자 권한으로 판매 채널에 새로운 카테고리를 성공적으로 생성하는 시나리오의 통합 테스트.
 *
 * 1. 관리자 계정 등록 및 인증(토큰 획득)
 * 2. 판매 채널 생성(POST /shoppingMallAiBackend/admin/channels)
 * 3. 카테고리 등록(POST
 *    /shoppingMallAiBackend/admin/channels/{channelId}/categories) - 고유
 *    code, name, (선택) description, order, (선택) parent_id 포함
 * 4. 응답: id, shopping_mall_ai_backend_channel_id, code, name, order,
 *    created_at, updated_at, deleted_at 등 필수 사업 속성 검증
 * 5. 필요한 필드 타입, 값, 고유성(채널 내 code, name), 연관성(채널 ID 일치, parent_id 포함 시 유효성) 체크
 * 6. 감사(audit) 필드(created_at, updated_at) 실제 시간 구조 및 값 검증
 * 7. 추가적으로, 카테고리 등록 후 GET을 통해 정상적으로 해당 카테고리가 조회되는지 최종 검증(단, 본 시점에서 GET 함수가
 *    미제공되어 omit)
 */
export async function test_api_admin_channel_category_create_success(
  connection: api.IConnection,
) {
  // 1. 관리자 계정 생성 및 인증(토큰 자동 저장)
  const adminUsername = RandomGenerator.alphabets(8);
  const adminEmail = `${RandomGenerator.alphabets(12)}@test.com`;
  const adminName = RandomGenerator.name();
  const adminPasswordHash = RandomGenerator.alphaNumeric(32);
  const adminJoin: IShoppingMallAiBackendAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        username: adminUsername,
        password_hash: adminPasswordHash,
        name: adminName,
        email: adminEmail,
        phone_number: null,
        is_active: true,
      } satisfies IShoppingMallAiBackendAdmin.ICreate,
    });
  typia.assert(adminJoin);
  TestValidator.equals(
    "관리자 등록 성공 및 필드 값 일치",
    adminJoin.admin.username,
    adminUsername,
  );

  // 2. 판매 채널 생성
  const channelPayload: IShoppingMallAiBackendChannel.ICreate = {
    code: RandomGenerator.alphabets(10),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    country: "KR",
    currency: "KRW",
    language: "ko",
    timezone: "Asia/Seoul",
  };
  const channel: IShoppingMallAiBackendChannel =
    await api.functional.shoppingMallAiBackend.admin.channels.create(
      connection,
      {
        body: channelPayload,
      },
    );
  typia.assert(channel);
  TestValidator.equals(
    "채널 코드 일치 확인",
    channel.code,
    channelPayload.code,
  );
  TestValidator.equals(
    "채널 이름 일치 확인",
    channel.name,
    channelPayload.name,
  );
  TestValidator.equals(
    "채널 ISO 국가/언어/통화/타임존 값 확인",
    channel.country,
    channelPayload.country,
  );
  TestValidator.equals(
    "채널 언어/통화/타임존 값 확인",
    channel.language,
    channelPayload.language,
  );
  TestValidator.equals(
    "채널 통화 값 확인",
    channel.currency,
    channelPayload.currency,
  );
  TestValidator.equals(
    "채널 타임존 값 확인",
    channel.timezone,
    channelPayload.timezone,
  );

  // 3. 카테고리 등록(최상위)
  const categoryCode = RandomGenerator.alphabets(7);
  const categoryName = RandomGenerator.paragraph({ sentences: 2 });
  const categoryOrder = 1;
  const categoryCreatePayload: IShoppingMallAiBackendChannelCategory.ICreate = {
    shopping_mall_ai_backend_channel_id: channel.id,
    code: categoryCode,
    name: categoryName,
    order: categoryOrder,
    description: RandomGenerator.paragraph({ sentences: 3 }),
  };
  const createdCategory: IShoppingMallAiBackendChannelCategory =
    await api.functional.shoppingMallAiBackend.admin.channels.categories.create(
      connection,
      {
        channelId: channel.id,
        body: categoryCreatePayload,
      },
    );
  typia.assert(createdCategory);

  // 핵심 필드 및 감사(audit) 필드/삭제되지 않았음을 검증
  TestValidator.equals(
    "카테고리 고유 코드 일치 확인",
    createdCategory.code,
    categoryCode,
  );
  TestValidator.equals(
    "카테고리명 일치 확인",
    createdCategory.name,
    categoryName,
  );
  TestValidator.equals(
    "카테고리 정렬 인덱스 일치",
    createdCategory.order,
    categoryOrder,
  );
  TestValidator.equals(
    "채널ID 일치 확인",
    createdCategory.shopping_mall_ai_backend_channel_id,
    channel.id,
  );
  TestValidator.equals(
    "최상위 카테고리 생성이라 parent_id는 null",
    createdCategory.parent_id,
    null,
  );
  TestValidator.predicate(
    "created_at이 ISO8601 date-time인지",
    typeof createdCategory.created_at === "string" &&
      !isNaN(Date.parse(createdCategory.created_at)),
  );
  TestValidator.predicate(
    "updated_at이 ISO8601 date-time인지",
    typeof createdCategory.updated_at === "string" &&
      !isNaN(Date.parse(createdCategory.updated_at)),
  );
  TestValidator.equals(
    "삭제되지 않은 상태임(soft deletion X)",
    createdCategory.deleted_at,
    null,
  );
}
