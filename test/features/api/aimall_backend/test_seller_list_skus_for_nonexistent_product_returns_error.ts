import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPageIAimallBackendSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendSku";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAimallBackendSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSku";

/**
 * 존재하지 않는 상품의 SKU 목록 조회 시 예외 검증
 *
 * 판매자가 잘못된(존재하지 않는) 상품 ID로 해당 상품의 SKU 목록을 요청할 때, 시스템에서 올바른 예외(404 Not Found 등)를
 * 반환하는지를 검증합니다.
 *
 * [테스트 단계]
 *
 * 1. 임의(가짜)의 UUID를 productId로 사용해 SKU 목록을 조회 시도
 * 2. API에서 404 Not Found 또는 그에 준하는 오류가 발생하는지 TestValidator로 검증
 */
export async function test_api_aimall_backend_test_seller_list_skus_for_nonexistent_product_returns_error(
  connection: api.IConnection,
) {
  // 1. 존재하지 않는 상품의 UUID 준비
  const fakeProductId = typia.random<string & tags.Format<"uuid">>();

  // 2. SKU 목록 조회 시 오류 반환 검증
  await TestValidator.error("존재하지 않는 상품의 SKU 목록 요청시 오류 반환")(
    async () => {
      await api.functional.aimall_backend.seller.products.skus.index(
        connection,
        {
          productId: fakeProductId,
        },
      );
    },
  );
}
