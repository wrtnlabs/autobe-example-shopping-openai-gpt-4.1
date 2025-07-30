import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCategory";

/**
 * 테스트: 카테고리의 parent_id를 존재하지 않는 UUID로 업데이트 시도 (무결성 검사)
 *
 * 해당 테스트는 상품 분류 카테고리의 parent_id 필드를 실존하지 않는 UUID로 변경하여 요청할 경우, API가 올바르게 비즈니스
 * 무결성(참조 무결성) 검사로 인해 업데이트를 거부하는지를 확인합니다.
 *
 * [검증 포인트]
 *
 * - 존재하지 않는 parent_id를 지정해 카테고리를 업데이트하면, 검증 오류(참조무결성 위반 등)로 인해 실패해야 함을 확인
 * - 잘못된 parent_id로 인한 트리 구조 꼬임을 시스템이 차단하는 것까지 보장
 *
 * [테스트 절차]
 *
 * 1. (의존성) 관리자인 상태에서 카테고리 하나를 신규 생성
 * 2. 판매자 업데이트 API에서 해당 카테고리의 parent_id를 임의의(존재하지 않는) UUID로 변경 시도
 * 3. 시스템이 참조 무결성(존재하지 않는 parent_id) 위반으로 업데이트 요청을 실패시키는지 확인 (에러 발생 필요)
 */
export async function test_api_aimall_backend_seller_categories_test_update_category_to_invalid_parent_id_seller(
  connection: api.IConnection,
) {
  // 1. (의존성 단계) 기본 카테고리 신규 생성 (관리자 API 사용)
  const baseCategory =
    await api.functional.aimall_backend.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.alphabets(12),
          depth: 1,
          parent_id: null,
        } satisfies IAimallBackendCategory.ICreate,
      },
    );
  typia.assert(baseCategory);

  // 2. 존재하지 않는 parent_id(UUID)로 업데이트 시도 (판매자 API 사용)
  const invalidParentId = typia.random<string & tags.Format<"uuid">>();
  TestValidator.error("존재하지 않는 parent_id 지정 시 실패해야 함")(
    async () => {
      await api.functional.aimall_backend.seller.categories.update(connection, {
        categoryId: baseCategory.id,
        body: {
          parent_id: invalidParentId,
        } satisfies IAimallBackendCategory.IUpdate,
      });
    },
  );
}
