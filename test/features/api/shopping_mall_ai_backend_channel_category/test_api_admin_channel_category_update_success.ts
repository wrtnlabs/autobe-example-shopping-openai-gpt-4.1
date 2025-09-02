import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendChannel";
import type { IShoppingMallAiBackendChannelCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendChannelCategory";

export async function test_api_admin_channel_category_update_success(
  connection: api.IConnection,
) {
  /**
   * 인증된 관리자가 기존 판매 채널 카테고리의 정보를 정상적으로 수정하는 시나리오.
   *
   * 1. 관리자가 가입하여 인증토큰을 획득함
   * 2. 판매 채널을 생성함 (카테고리의 소속 채널)
   * 3. 판매 채널에 카테고리를 생성함
   * 4. 생성된 카테고리를 여러 필드 값(이름, 코드, 상위카테고리(null), 정렬순서, 설명 등) 변경하여 업데이트
   * 5. 응답으로 받은 카테고리 객체의 모든 변경 필드가 정상 반영되었는지 및 updated_at 이 갱신되었는지 검증
   */

  // 1. 관리자 계정 가입 및 인증
  const adminJoinInput = {
    username: RandomGenerator.alphabets(10),
    password_hash: RandomGenerator.alphaNumeric(32),
    name: RandomGenerator.name(),
    email: `${RandomGenerator.alphabets(8)}@test.com`,
    phone_number: RandomGenerator.mobile(),
    is_active: true,
  } satisfies IShoppingMallAiBackendAdmin.ICreate;
  const adminJoinResult = await api.functional.auth.admin.join(connection, {
    body: adminJoinInput,
  });
  typia.assert(adminJoinResult);
  const admin = adminJoinResult.admin;

  // 2. 판매 채널 생성
  const channelInput = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    country: "KR",
    currency: "KRW",
    language: "ko",
    timezone: "Asia/Seoul",
  } satisfies IShoppingMallAiBackendChannel.ICreate;
  const channel =
    await api.functional.shoppingMallAiBackend.admin.channels.create(
      connection,
      { body: channelInput },
    );
  typia.assert(channel);

  // 3. 카테고리 생성
  const categoryInput = {
    shopping_mall_ai_backend_channel_id: channel.id,
    parent_id: null,
    code: RandomGenerator.alphaNumeric(6),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    order: 1,
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

  // 4. 카테고리 수정 입력값 준비 (name, code, parent_id, description, order 모두 변경)
  const updatedCategoryInput = {
    name: RandomGenerator.name(),
    code: RandomGenerator.alphaNumeric(6),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    parent_id: null,
    order: 2,
  } satisfies IShoppingMallAiBackendChannelCategory.IUpdate;

  // 이전 updated_at 값 보관
  const prevUpdatedAt = category.updated_at;

  // 5. 카테고리 수정 및 결과 검증
  const updatedCategory =
    await api.functional.shoppingMallAiBackend.admin.channels.categories.update(
      connection,
      {
        channelId: channel.id,
        categoryId: category.id,
        body: updatedCategoryInput,
      },
    );
  typia.assert(updatedCategory);
  // 필드 변경 반영 여부 검증
  TestValidator.equals(
    "카테고리명 변경 반영",
    updatedCategory.name,
    updatedCategoryInput.name,
  );
  TestValidator.equals(
    "코드 변경 반영",
    updatedCategory.code,
    updatedCategoryInput.code,
  );
  TestValidator.equals(
    "order 변경 반영",
    updatedCategory.order,
    updatedCategoryInput.order,
  );
  TestValidator.equals(
    "description 변경 반영",
    updatedCategory.description,
    updatedCategoryInput.description,
  );
  TestValidator.equals(
    "parent_id 변경 반영",
    updatedCategory.parent_id,
    updatedCategoryInput.parent_id,
  );
  // updated_at 갱신(이전보다 최신)
  TestValidator.predicate(
    "updated_at 이 변경되어야 함",
    new Date(updatedCategory.updated_at).getTime() >
      new Date(prevUpdatedAt).getTime(),
  );
}
