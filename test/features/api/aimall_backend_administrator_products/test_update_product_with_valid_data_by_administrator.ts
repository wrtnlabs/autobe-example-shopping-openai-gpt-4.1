import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSeller";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";

/**
 * 관리자가 모든 판매자 소유 상품에 대해 정상적으로 업데이트 권한을 행사할 수 있는지 검증한다.
 *
 * - 테스트용 판매자를 생성한 후, 해당 판매자 소유의 상품을 등록한다.
 * - 관리자가 상품 정보를 일부 필드만 선택해 업데이트 요청하면, 반환 결과에 변경 사항이 반영되어야 한다.
 * - 상품의 식별자(productId), 타이틀, 카테고리, 상태 변경 등 각각이 정상 적용됨을 검증한다.
 *
 * 검증 절차:
 *
 * 1. 테스트 판매자 등록(관리자 권한)
 * 2. 해당 판매자 상품 등록
 * 3. 특정 필드(title, category_id, status) 변경 업데이트 요청(관리자 권한)
 * 4. 응답에서 변경된 필드가 정확히 반영되었는지 assert로 확인
 */
export async function test_api_aimall_backend_administrator_products_test_update_product_with_valid_data_by_administrator(
  connection: api.IConnection,
) {
  // 1. 테스트용 판매자 등록
  const seller =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      {
        body: {
          business_name: RandomGenerator.name(),
          email: typia.random<string & tags.Format<"email">>(),
          contact_phone: RandomGenerator.mobile(),
          status: "approved",
        },
      },
    );
  typia.assert(seller);

  // 2. 테스트용 판매자 상품 등록
  const originalProduct =
    await api.functional.aimall_backend.seller.products.create(connection, {
      body: {
        category_id: typia.random<string & tags.Format<"uuid">>(),
        seller_id: seller.id,
        title: "원래상품-" + RandomGenerator.alphabets(6),
        description: RandomGenerator.paragraph()(),
        main_thumbnail_uri:
          "https://cdn.example.com/images/" + RandomGenerator.alphabets(8),
        status: "active",
      },
    });
  typia.assert(originalProduct);

  // 3. 관리자가 상품 정보 일부 업데이트(title, category_id, status)
  const newTitle = "변경상품-" + RandomGenerator.alphaNumeric(8);
  const newCategoryId = typia.random<string & tags.Format<"uuid">>();
  const newStatus = "inactive";
  const updated =
    await api.functional.aimall_backend.administrator.products.update(
      connection,
      {
        productId: originalProduct.id,
        body: {
          title: newTitle,
          category_id: newCategoryId,
          status: newStatus,
        },
      },
    );
  typia.assert(updated);

  // 4. 변경 사항 검증
  TestValidator.equals("상품 ID 일치")(updated.id)(originalProduct.id);
  TestValidator.equals("카테고리 변경됨")(updated.category_id)(newCategoryId);
  TestValidator.equals("타이틀 변경됨")(updated.title)(newTitle);
  TestValidator.equals("상태 변경됨")(updated.status)(newStatus);
}
