import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCategory";

/**
 * 관리자가 자식 카테고리의 이름을 동일 부모 하위의 다른 형제와 동일하게 변경하려 할 때 유니크 제약조건((parent_id, name))
 * 위반 오류가 발생하는지 검증합니다.
 *
 * 이 테스트는:
 *
 * 1. 상위 카테고리(parent)를 하나 생성한다.
 * 2. 해당 parent 하위에 서로 다른 이름으로 두 개의 자식 카테고리(child)를 생성한다.
 * 3. 한 자식의 이름을 업데이트하여 다른 자식과 동일하게 바꾸려 시도한다.
 * 4. 이때 (parent_id, name) 고유 제약 위배로 인해 오류가 반드시 발생해야 한다.
 *
 * 이는 동일 parent 하위에 동일 이름의 카테고리가 존재하지 않음을 보장하는 비즈니스 로직/DB 제약의 유효성을 검증하는 테스트입니다.
 */
export async function test_api_aimall_backend_administrator_categories_childCategories_test_admin_update_child_category_to_duplicate_name_failure(
  connection: api.IConnection,
) {
  // 1. 상위 카테고리 생성
  const parentCategory =
    await api.functional.aimall_backend.administrator.categories.create(
      connection,
      {
        body: {
          name: "ParentCategory",
          parent_id: null,
          depth: 1,
        } satisfies IAimallBackendCategory.ICreate,
      },
    );
  typia.assert(parentCategory);

  // 2. 이름이 다른 두 자식 카테고리 생성
  const childA =
    await api.functional.aimall_backend.administrator.categories.childCategories.create(
      connection,
      {
        categoryId: parentCategory.id,
        body: {
          name: "childA",
          parent_id: parentCategory.id,
          depth: 2,
        } satisfies IAimallBackendCategory.ICreate,
      },
    );
  typia.assert(childA);

  const childB =
    await api.functional.aimall_backend.administrator.categories.childCategories.create(
      connection,
      {
        categoryId: parentCategory.id,
        body: {
          name: "childB",
          parent_id: parentCategory.id,
          depth: 2,
        } satisfies IAimallBackendCategory.ICreate,
      },
    );
  typia.assert(childB);

  // 3. childA의 이름을 childB와 동일하게 업데이트 시도 → 고유 제약 위반이 발생해야 함
  await TestValidator.error(
    "동일 parent 하위에서 자식 이름 중복 시도 시 유니크 제약조건 위반",
  )(async () => {
    await api.functional.aimall_backend.administrator.categories.childCategories.update(
      connection,
      {
        categoryId: parentCategory.id,
        childCategoryId: childA.id,
        body: {
          name: childB.name,
        } satisfies IAimallBackendCategory.IUpdate,
      },
    );
  });
}
