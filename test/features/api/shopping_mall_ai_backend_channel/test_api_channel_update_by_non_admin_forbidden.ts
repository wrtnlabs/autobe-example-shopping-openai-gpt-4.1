import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendChannel";

/**
 * 비관리자(비인증) 상태에서 sales channel(영업 채널) 수정 금지를 검증한다.
 *
 * 오직 인증된 관리자만이 영업 채널의 설정 및 정보를 변경할 수 있고, 일반 사용자 혹은 인증되지 않은 상태에서는 이 권한이 부여되지
 * 않는다.
 *
 * 테스트 단계
 *
 * 1. 관리자 계정 가입(관리자 인증 컨텍스트 필요)
 * 2. 관리자 자격으로 sales channel 등록
 * 3. Connection에서 Authorization 헤더 제거 (비인증 상태 전환)
 * 4. 비관리자(비로그인)로 채널 update API 호출. 임의 네임/설명 등 수정 시도
 * 5. 이때 반드시 인증/권한 관련 에러(401/403)가 발생해야 성공
 */
export async function test_api_channel_update_by_non_admin_forbidden(
  connection: api.IConnection,
) {
  // 1. 관리자 계정 가입
  const adminInput: IShoppingMallAiBackendAdmin.ICreate = {
    username: RandomGenerator.name(),
    password_hash: RandomGenerator.alphaNumeric(32),
    name: RandomGenerator.name(),
    email: `${RandomGenerator.alphaNumeric(8)}@company.com`,
    is_active: true,
  };
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: adminInput,
  });
  typia.assert(adminJoin);
  const admin = adminJoin.admin;

  // 2. sales channel 등록 (관리자 자격)
  const channelInput: IShoppingMallAiBackendChannel.ICreate = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    country: "KR",
    currency: "KRW",
    language: "ko-KR",
    timezone: "Asia/Seoul",
    description: RandomGenerator.paragraph({ sentences: 6 }),
  };
  const channel =
    await api.functional.shoppingMallAiBackend.admin.channels.create(
      connection,
      { body: channelInput },
    );
  typia.assert(channel);

  // 3. connection에서 Authorization 헤더 제거하여 비관리자 상태로 만듦
  const nonAdminConnection: api.IConnection = { ...connection, headers: {} };

  // 4. update API에 비관리자 접속 (임의 값으로 수정 시도)
  await TestValidator.error(
    "비관리자(비로그인) 상태에서 채널 설정 수정 시 권한에러 발생 필수",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.channels.update(
        nonAdminConnection,
        {
          channelId: channel.id,
          body: {
            name: RandomGenerator.paragraph({ sentences: 2 }),
            description: RandomGenerator.paragraph({ sentences: 5 }),
          } satisfies IShoppingMallAiBackendChannel.IUpdate,
        },
      );
    },
  );
}
