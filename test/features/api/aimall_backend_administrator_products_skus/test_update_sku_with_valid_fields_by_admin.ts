import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSku";

/**
 * E2E: 관리자 SKU 수정 성공 시나리오
 *
 * 이 테스트는 관리자가 상품에 속한 기존 SKU의 정보를 성공적으로 업데이트하는 과정을 검증합니다.
 *
 * 비즈니스 시나리오:
 *
 * 1. 관리자가 신규 상품을 생성합니다.
 * 2. 해당 상품에 SKU를 하나 등록합니다.
 * 3. SKU 코드(sku_code)를 새로운 값(중복되지 않는 랜덤 값)으로 수정합니다.
 * 4. API 응답에서 SKU의 id/product_id는 변하지 않고, sku_code만 정상적으로 변경되었는지 확인합니다.
 * 5. 응답 구조가 IAimallBackendSku 타입과 일치하는지도 검증합니다.
 *
 * 테스트 절차:
 *
 * 1. 상품 생성 (IAimallBackendProduct.ICreate 사용)
 * 2. SKU 등록 (해당 상품에 속하도록)
 * 3. SKU 코드 변경 (PUT
 *    /aimall-backend/administrator/products/{productId}/skus/{skuId})
 * 4. 응답 검증 (id/product_id 불변, sku_code 변경, 타입 일치)
 *
 * 전제 조건:
 *
 * - Connection 파라미터가 관리자 권한(인증) 연결이어야 합니다.
 */
export async function test_api_aimall_backend_administrator_products_skus_test_update_sku_with_valid_fields_by_admin(
  connection: api.IConnection,
) {
  // 1. 신규 상품 생성
  const productInput = {
    category_id: typia.random<string & tags.Format<"uuid">>(),
    seller_id: typia.random<string & tags.Format<"uuid">>(),
    title: RandomGenerator.paragraph()(),
    status: "active",
    description: RandomGenerator.content()()(),
    // main_thumbnail_uri는 optional이므로 undefined로 둘 수 있음
  } satisfies IAimallBackendProduct.ICreate;
  const product =
    await api.functional.aimall_backend.administrator.products.create(
      connection,
      { body: productInput },
    );
  typia.assert(product);

  // 2. SKU 1개 등록
  const skuInput = {
    product_id: product.id,
    sku_code: `SKU-${RandomGenerator.alphaNumeric(8)}`,
  } satisfies IAimallBackendSku.ICreate;
  const sku =
    await api.functional.aimall_backend.administrator.products.skus.create(
      connection,
      {
        productId: product.id,
        body: skuInput,
      },
    );
  typia.assert(sku);

  // 3. SKU 코드 변경 (PUT)
  const newSkuCode = `SKU-${RandomGenerator.alphaNumeric(10)}`;
  const updateInput = {
    sku_code: newSkuCode,
  } satisfies IAimallBackendSku.IUpdate;
  const updated =
    await api.functional.aimall_backend.administrator.products.skus.update(
      connection,
      {
        productId: product.id,
        skuId: sku.id,
        body: updateInput,
      },
    );
  typia.assert(updated);

  // 4. 응답 필드 검증
  TestValidator.equals("SKU id 변경 없음")(updated.id)(sku.id);
  TestValidator.equals("product_id 변경 없음")(updated.product_id)(product.id);
  TestValidator.equals("sku_code 정상 변경")(updated.sku_code)(newSkuCode);
}
