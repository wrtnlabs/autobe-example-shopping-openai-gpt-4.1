import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendChannel";
import type { IShoppingMallAiBackendChannelCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendChannelCategory";

export async function test_api_admin_channel_category_create_duplicate_code_error(
  connection: api.IConnection,
) {
  /**
   * 동일 채널 내 중복 code로 카테고리 생성 시 유효성/비즈니스 오류가 반환되는지 검증한다.
   *
   * 1. 관리자 계정 가입 및 인증
   * 2. 신규 채널 생성
   * 3. 첫 번째 카테고리 (code=X) 정상 생성
   * 4. 동일한 code(X)로 두 번째 카테고리 생성 시 오류 발생 확인
   * 5. 오류 구조 및 code 필드의 채널 내 유일성 보장 검증
   */
  // 1. 관리자 계정 가입 및 인증
  const adminCredentials = {
    username: RandomGenerator.alphaNumeric(8),
    password_hash: RandomGenerator.alphaNumeric(20),
    name: RandomGenerator.name(),
    email: `${RandomGenerator.alphaNumeric(8)}@test.com`,
    is_active: true,
    phone_number: RandomGenerator.mobile(),
  } satisfies IShoppingMallAiBackendAdmin.ICreate;
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: adminCredentials,
  });
  typia.assert(adminAuth);

  // 2. 신규 채널 생성
  const channelInput = {
    code: RandomGenerator.alphaNumeric(5),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph(),
    country: "KR",
    currency: "KRW",
    language: "ko-KR",
    timezone: "Asia/Seoul",
  } satisfies IShoppingMallAiBackendChannel.ICreate;
  const channel =
    await api.functional.shoppingMallAiBackend.admin.channels.create(
      connection,
      { body: channelInput },
    );
  typia.assert(channel);

  // 3. 첫 번째 카테고리 (code=X) 정상 생성
  const duplicatedCode = RandomGenerator.alphaNumeric(6);
  const categoryInput = {
    shopping_mall_ai_backend_channel_id: channel.id,
    code: duplicatedCode,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph(),
    order: 1,
    parent_id: null,
  } satisfies IShoppingMallAiBackendChannelCategory.ICreate;
  const category =
    await api.functional.shoppingMallAiBackend.admin.channels.categories.create(
      connection,
      { channelId: channel.id, body: categoryInput },
    );
  typia.assert(category);

  // 4. 동일한 code(X)로 두 번째 카테고리 생성 (중복 오류 기대)
  const duplicateCategoryInput = {
    shopping_mall_ai_backend_channel_id: channel.id,
    code: duplicatedCode, // 중복
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph(),
    order: 2,
    parent_id: null,
  } satisfies IShoppingMallAiBackendChannelCategory.ICreate;

  await TestValidator.error(
    "동일 채널 내 중복 code로 카테고리 생성 시 오류 발생",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.channels.categories.create(
        connection,
        {
          channelId: channel.id,
          body: duplicateCategoryInput,
        },
      );
    },
  );
}
