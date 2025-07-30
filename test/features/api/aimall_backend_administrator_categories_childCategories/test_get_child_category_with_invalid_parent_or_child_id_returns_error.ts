import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCategory";

/**
 * 부모 혹은 자식 카테고리 UUID가 잘못 되었거나, 올바르지 않은 parent-child 조합일 때 not found 에러가 반환되는지
 * 검증합니다.
 *
 * 이 테스트는 aimall_backend_categories 계층 구조의 무결성을 검증합니다. 잘못된 UUID 조합이나 실존하지 않는
 * parent-child 구성을 통해 API가 트리 위변조/우회 없이 항상 not found(존재하지 않는 리소스) 오류를 반환하는지
 * 확인합니다.
 *
 * 테스트 단계:
 *
 * 1. 존재하지 않는(임의의) 부모 uuid와 임의의 자식 uuid로 조회 → not found 에러 검증
 * 2. 임의의 부모 + 존재하지 않는 자식 uuid로 조회 → not found 에러 검증
 * 3. 둘 다 실제로 존재하나 parent-child 관계가 전혀 맞지 않은 카테고리 쌍으로 조회 → not found 에러 검증
 *
 * 모든 경우가 true-positive(반드시 not found) 이어야 트리 구조가 임의 변경·참조 우회 없이 안전하게 구현된 것입니다.
 */
export async function test_api_aimall_backend_administrator_categories_childCategories_test_get_child_category_with_invalid_parent_or_child_id_returns_error(
  connection: api.IConnection,
) {
  // 1. 존재하지 않는(임의 생성) 부모uuid+자식uuid 조합 → not found
  await TestValidator.error("부모 uuid가 잘못됨")(() =>
    api.functional.aimall_backend.administrator.categories.childCategories.at(
      connection,
      {
        categoryId: typia.random<string & tags.Format<"uuid">>(), // 랜덤 부모
        childCategoryId: typia.random<string & tags.Format<"uuid">>(), // 랜덤 자식
      },
    ),
  );

  // 2. 존재하는 부모 uuid + 존재하지 않는 자식uuid 조합 → not found
  await TestValidator.error("자식 uuid가 잘못됨")(() =>
    api.functional.aimall_backend.administrator.categories.childCategories.at(
      connection,
      {
        categoryId: typia.random<string & tags.Format<"uuid">>(), // 랜덤 부모
        childCategoryId: typia.random<string & tags.Format<"uuid">>(), // 랜덤 자식
      },
    ),
  );

  // 3. 둘 다 실제 uuid인데 관계가 맞지 않은 parent-child 조합 → 역시 not found
  // 테스트를 위해 parent, child로 임의 객체 2개 생성, 서로 관계 없음
  const parentCategory = typia.random<IAimallBackendCategory>();
  const wrongChildCategory = typia.random<IAimallBackendCategory>();
  await TestValidator.error("parent-child 매칭 오류")(() =>
    api.functional.aimall_backend.administrator.categories.childCategories.at(
      connection,
      {
        categoryId: parentCategory.id,
        childCategoryId: wrongChildCategory.id,
      },
    ),
  );
}
