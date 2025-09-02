import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendProductTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductTag";
import type { IPageIShoppingMallAiBackendProductTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendProductTag";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function test_api_admin_product_tag_search_soft_deleted_tags_excluded(
  connection: api.IConnection,
) {
  /**
   * 검증 목적: 소프트 삭제된 상품 태그가 관리자 태그 검색 결과에서 제외되는지 확인합니다.
   *
   * [테스트 단계 및 비즈니스 논리]
   *
   * 1. 관리자로 가입 및 인증 진행
   * 2. 관리자 권한으로 상품 태그 3개(A, B, C) 생성
   * 3. 상품 태그 B를 소프트 삭제(erase API 활용)
   * 4. 전체 태그 검색(기본 상태, deleted 생략) 결과에서 B가 나타나지 않는지 검사
   *
   *    - A, C는 존재해야 함
   *    - B의 tag_code/tag_name으로 부분/정확 검색 시에도 B는 나오지 않아야 함
   * 5. Deleted: true로 검색 시 B가 다시 나오며(실제 DB에는 남아있음), 소프트 삭제가 물리적 삭제가 아님을 확인
   *
   * [주요 검증 포인트]
   *
   * - 소프트 삭제 처리 후 기본 검색 및 부분/정확 검색 결과에서 B가 나타나지 않음
   * - Deleted: true 옵션으로 검색할 때만 B가 포함됨
   * - 다른 태그는 정상적으로 검색됨
   *
   * @param connection Nestia API 연결 객체 (관리자 인증이 포함됨)
   */

  // 1. 관리자 회원가입 및 인증
  const adminInput: IShoppingMallAiBackendAdmin.ICreate = {
    username: RandomGenerator.alphaNumeric(12),
    password_hash: RandomGenerator.alphaNumeric(32),
    name: RandomGenerator.name(),
    email: `${RandomGenerator.alphaNumeric(8)}@company.com`,
    phone_number: RandomGenerator.mobile(),
    is_active: true,
  };
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: adminInput,
  });
  typia.assert(adminAuth);

  // 2. 상품 태그 3개(A, B, C) 생성
  const tagInputs: IShoppingMallAiBackendProductTag.ICreate[] = [
    "A",
    "B",
    "C",
  ].map((s) => ({
    tag_name: `SampleTag${s}_${RandomGenerator.alphaNumeric(4)}`,
    tag_code: `sample_tag_${s.toLowerCase()}_${RandomGenerator.alphaNumeric(5)}`,
  }));
  const createdTags: IShoppingMallAiBackendProductTag[] = [];
  for (const input of tagInputs) {
    const tag =
      await api.functional.shoppingMallAiBackend.admin.productTags.create(
        connection,
        {
          body: input,
        },
      );
    typia.assert(tag);
    createdTags.push(tag);
  }
  const [tagA, tagB, tagC] = createdTags;

  // 3. 태그 B 소프트 삭제
  await api.functional.shoppingMallAiBackend.admin.productTags.erase(
    connection,
    {
      tagId: tagB.id as string, // UUID string은 이미 타입에 맞게 생성됨
    },
  );

  // 4. 삭제되지 않은 전체 태그 검색 (deleted 생략)
  {
    const res =
      await api.functional.shoppingMallAiBackend.admin.productTags.index(
        connection,
        {
          body: {},
        },
      );
    typia.assert(res);
    TestValidator.predicate(
      "기본 검색 결과에 소프트 삭제된 태그(B)는 나타나지 않는다",
      res.data.every((tag) => tag.id !== tagB.id),
    );
    TestValidator.predicate(
      "A 태그는 기본 검색 결과에 포함된다",
      res.data.some((tag) => tag.id === tagA.id),
    );
    TestValidator.predicate(
      "C 태그는 기본 검색 결과에 포함된다",
      res.data.some((tag) => tag.id === tagC.id),
    );
  }

  // 5. 삭제된 태그의 tag_name 부분일치로 검색 시 B 미포함
  {
    const partial = tagB.tag_name.substring(
      0,
      Math.max(1, Math.floor(tagB.tag_name.length / 2)),
    );
    const res =
      await api.functional.shoppingMallAiBackend.admin.productTags.index(
        connection,
        {
          body: { tag_name: partial },
        },
      );
    typia.assert(res);
    TestValidator.predicate(
      "부분 일치(tag_name) 검색 시도에도 소프트 삭제된 태그 B는 포함되지 않는다",
      res.data.every((tag) => tag.id !== tagB.id),
    );
  }

  // 6. 삭제된 태그의 tag_code 정확 일치로 검색 시 B 미포함
  {
    const res =
      await api.functional.shoppingMallAiBackend.admin.productTags.index(
        connection,
        {
          body: { tag_code: tagB.tag_code },
        },
      );
    typia.assert(res);
    TestValidator.predicate(
      "정확 일치(tag_code) 조건으로 검색 시도에도 소프트 삭제된 태그 B는 포함되지 않는다",
      res.data.every((tag) => tag.id !== tagB.id),
    );
  }

  // 7. deleted: true 옵션으로 검색하면 B가 다시 나타남(논리적 삭제 확인)
  {
    const res =
      await api.functional.shoppingMallAiBackend.admin.productTags.index(
        connection,
        {
          body: { deleted: true },
        },
      );
    typia.assert(res);
    TestValidator.predicate(
      "deleted: true 옵션으로 검색 시 소프트 삭제된 태그 B가 포함된다",
      res.data.some((tag) => tag.id === tagB.id),
    );
  }
}
