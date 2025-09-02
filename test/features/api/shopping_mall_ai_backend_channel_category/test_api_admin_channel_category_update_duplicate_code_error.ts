import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendChannel";
import type { IShoppingMallAiBackendChannelCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendChannelCategory";

/**
 * 동일 채널 내 카테고리 code 중복 업데이트 시 유일성 검증 에러를 확인한다.
 *
 * 본 테스트는 관리자 인증 후, 채널 하위에 서로 다른 code로 두 개의 카테고리를 생성한다. 이후 첫 번째 카테고리의 code를
 * 두 번째 카테고리의 code로 변경 시도하여, code 중복(unique) 제약조건에 따라 validation error가 발생함을
 * 검증한다.
 *
 * 단계:
 *
 * 1. 관리자 회원가입 및 인증 토큰 확보
 * 2. 테스트용 채널 생성 (한국, KRW, ko, Asia/Seoul)
 * 3. 코드값이 다른 두 개의 카테고리(각각 order 1,2) 생성
 * 4. 1번 카테고리의 code를 2번 카테고리의 code로 update 시도 (중복 code)
 * 5. API로부터 validation error가 실제 발생하는지 TestValidator.error로 확인
 *
 * 이를 통해 API(및 백엔드 로직)의 채널 내 카테고리 유일성/무결성 보장 여부를 검증한다.
 */
export async function test_api_admin_channel_category_update_duplicate_code_error(
  connection: api.IConnection,
) {
  // 1. 관리자 계정 가입 및 인증
  const adminUsername: string = RandomGenerator.alphabets(10);
  const admin: IShoppingMallAiBackendAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        username: adminUsername,
        password_hash: RandomGenerator.alphaNumeric(32),
        name: RandomGenerator.name(2),
        email: `${adminUsername}@test.com` as string & tags.Format<"email">,
        phone_number: null,
        is_active: true,
      } satisfies IShoppingMallAiBackendAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. 채널 생성 (국가/통화/언어/타임존 모두 한국 기준)
  const channelInput: IShoppingMallAiBackendChannel.ICreate = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    country: "KR",
    currency: "KRW",
    language: "ko",
    timezone: "Asia/Seoul",
  };
  const channel: IShoppingMallAiBackendChannel =
    await api.functional.shoppingMallAiBackend.admin.channels.create(
      connection,
      {
        body: channelInput,
      },
    );
  typia.assert(channel);

  // 3. 서로 다른 code로 두 개의 카테고리 생성
  let code1 = RandomGenerator.alphaNumeric(6);
  let code2 = RandomGenerator.alphaNumeric(6);
  while (code1 === code2) {
    code2 = RandomGenerator.alphaNumeric(6);
  }
  const category1: IShoppingMallAiBackendChannelCategory =
    await api.functional.shoppingMallAiBackend.admin.channels.categories.create(
      connection,
      {
        channelId: channel.id,
        body: {
          shopping_mall_ai_backend_channel_id: channel.id,
          parent_id: null,
          code: code1,
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          order: 1,
        } satisfies IShoppingMallAiBackendChannelCategory.ICreate,
      },
    );
  typia.assert(category1);

  const category2: IShoppingMallAiBackendChannelCategory =
    await api.functional.shoppingMallAiBackend.admin.channels.categories.create(
      connection,
      {
        channelId: channel.id,
        body: {
          shopping_mall_ai_backend_channel_id: channel.id,
          parent_id: null,
          code: code2,
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          order: 2,
        } satisfies IShoppingMallAiBackendChannelCategory.ICreate,
      },
    );
  typia.assert(category2);

  // 4. 첫 번째 카테고리의 code를 두 번째 카테고리의 code로 변경(update) 시도 - 중복에러 기대
  await TestValidator.error(
    "동일 채널 내 두 카테고리의 code 중복 시 update 호출은 반드시 validation error를 반환해야 한다",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.channels.categories.update(
        connection,
        {
          channelId: channel.id,
          categoryId: category1.id,
          body: {
            code: code2,
          } satisfies IShoppingMallAiBackendChannelCategory.IUpdate,
        },
      );
    },
  );
}
