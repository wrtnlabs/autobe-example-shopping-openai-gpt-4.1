import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IPageIAimallBackendSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendSku";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAimallBackendSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSku";

/**
 * 상품에 연결된 SKU가 전혀 없는 경우 SKU 목록 조회 시, data가 빈 배열([])로 반환되는지 검증합니다.
 *
 * - 테스트 대상: /aimall-backend/administrator/products/{productId}/skus (GET)
 * - 시나리오 개요:
 *
 *   1. SKU를 하나도 등록하지 않은 상품을 생성합니다.
 *   2. 해당 상품의 ID로 SKU 목록을 조회합니다.
 *   3. 결과 페이지의 data 배열이 빈 배열인지 검증합니다.
 *
 * 이 테스트는 재고 옵션이 없는 신상품 등록 직후 SKU 목록 조회 시, 불필요한 데이터 노출이나 빈값 처리 미스 없이 올바른 스키마,
 * 페이징 데이터가 내려오는지 확인하려는 목적입니다. 실제 운영환경에서는 카테고리/셀러 UUID가 유효 엔티티여야 하지만, 본 테스트에서는
 * mock uuid 사용이 타당합니다.
 */
export async function test_api_aimall_backend_administrator_products_skus_test_list_skus_for_product_with_no_skus_returns_empty_list(
  connection: api.IConnection,
) {
  // 1. 선행: SKU 없이 사용할 신규 상품 카테고리 ID, 셀러 ID mock 생성
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  const sellerId = typia.random<string & tags.Format<"uuid">>();

  // 2. SKU 미연결 상태로 상품 등록
  const product =
    await api.functional.aimall_backend.administrator.products.create(
      connection,
      {
        body: {
          category_id: categoryId,
          seller_id: sellerId,
          title: "Empty SKU Product-" + RandomGenerator.alphaNumeric(8),
          description: "테스트용 SKU 없는 상품",
          status: "active",
        } satisfies IAimallBackendProduct.ICreate,
      },
    );
  typia.assert(product);

  // 3. SKU 목록 조회 시도 및 결과 검증
  const skuPage =
    await api.functional.aimall_backend.administrator.products.skus.index(
      connection,
      {
        productId: product.id,
      },
    );
  typia.assert(skuPage);
  TestValidator.equals("생성 직후 상품의 SKU 목록이 비어있음")(skuPage.data)(
    [],
  );
}
