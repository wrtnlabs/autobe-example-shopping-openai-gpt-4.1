import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCategory";

/**
 * 자식 카테고리가 존재하는 부모 카테고리 삭제(딜리트) 거부 검증
 *
 * 이 테스트는 상위 카테고리(부모)에 종속된 하위 카테고리(자식)가 존재할 때, 판매자 권한으로 부모 카테고리를 하드 삭제(DELETE)
 * 시도 시 비즈니스 규칙(참조 무결성)에 의해 거부(에러)가 발생하는지 검증합니다.
 *
 * [테스트 절차]
 *
 * 1. 관리자 권한으로 루트(부모) 카테고리를 생성
 * 2. 동일 parent_id 하에 자식 카테고리를 생성
 * 3. 판매자 엔드포인트에서 자식이 존재하는 부모 카테고리 삭제 시도
 * 4. 기대: 참조 무결성 위반으로 인한 삭제 거부(에러)
 */
export async function test_api_aimall_backend_seller_categories_test_delete_category_with_children_seller(
  connection: api.IConnection,
) {
  // 1. 루트(부모) 카테고리 생성
  const parentCategory =
    await api.functional.aimall_backend.administrator.categories.create(
      connection,
      {
        body: {
          parent_id: null,
          name: RandomGenerator.alphabets(8),
          depth: 1,
        } satisfies IAimallBackendCategory.ICreate,
      },
    );
  typia.assert(parentCategory);

  // 2. 자식 카테고리 생성 (parent_id를 parentCategory.id로 연결)
  const childCategory =
    await api.functional.aimall_backend.administrator.categories.create(
      connection,
      {
        body: {
          parent_id: parentCategory.id,
          name: RandomGenerator.alphabets(6),
          depth: 2,
        } satisfies IAimallBackendCategory.ICreate,
      },
    );
  typia.assert(childCategory);

  // 3. 자식이 있는 부모 카테고리 삭제 시도 → 참조무결성 에러 발생 검증
  await TestValidator.error(
    "자식 카테고리가 존재하는 부모 카테고리 삭제는 거부되어야 함",
  )(async () => {
    await api.functional.aimall_backend.seller.categories.erase(connection, {
      categoryId: parentCategory.id,
    });
  });
}
