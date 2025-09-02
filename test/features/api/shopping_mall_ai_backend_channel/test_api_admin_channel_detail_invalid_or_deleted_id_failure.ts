import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendChannel";

export async function test_api_admin_channel_detail_invalid_or_deleted_id_failure(
  connection: api.IConnection,
) {
  /**
   * 삭제되었거나 잘못된 ID로 관리자 채널 상세 조회를 시도할 때의 실패 처리를 검증한다.
   *
   * 워크플로우:
   *
   * 1. 신규 관리자를 회원가입(인증 획득)
   * 2. 채널을 생성
   * 3. 해당 채널을 소프트 삭제
   * 4. 삭제된 채널의 상세를 같은 channelId로 조회 (null 또는 오류 발생해야 정상)
   * 5. 올바르지 않은(잘못된 포맷) channelId로 상세 조회를 시도해 시스템의 validation 및 오류처리 확인
   */
  // 1. 관리자 계정 생성(로그인 및 인증)
  const adminJoinOutput = await api.functional.auth.admin.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(8),
      password_hash: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(2),
      email: `${RandomGenerator.alphaNumeric(4)}@testcompany.com`,
      phone_number: RandomGenerator.mobile(),
      is_active: true,
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });
  typia.assert(adminJoinOutput);

  // 2. 채널 생성
  const channel =
    await api.functional.shoppingMallAiBackend.admin.channels.create(
      connection,
      {
        body: {
          code: RandomGenerator.alphaNumeric(6),
          name: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 3,
            wordMax: 8,
          }),
          description: RandomGenerator.paragraph({ sentences: 4 }),
          country: "KR",
          currency: "KRW",
          language: "ko",
          timezone: "Asia/Seoul",
        } satisfies IShoppingMallAiBackendChannel.ICreate,
      },
    );
  typia.assert(channel);

  // 3. 생성된 채널을 소프트 삭제
  await api.functional.shoppingMallAiBackend.admin.channels.erase(connection, {
    channelId: channel.id,
  });

  // 4. 삭제된 채널 상세 조회 시도(정상적으론 null, 실제론 비즈니스 에러 혹은 예외 발생 가능)
  await TestValidator.error(
    "soft deleted channel should not be retrievable",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.channels.at(connection, {
        channelId: channel.id,
      });
    },
  );

  // 5. 잘못된 UUID channelId 입력 시 에러
  const invalidChannelId = RandomGenerator.alphaNumeric(12); // 정상 UUID 아님
  await TestValidator.error(
    "malformed channelId format should result in error",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.channels.at(connection, {
        channelId: invalidChannelId as any, // 타입 에러 테스트. 실제 런타임에서 유효성 검증 실패 기대
      });
    },
  );
}
