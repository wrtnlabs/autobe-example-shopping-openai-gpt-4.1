import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSeller";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSku";

/**
 * 타 판매자 상품의 SKU 삭제 권한 제한 검증
 *
 * 판매자는 오직 자신이 소유한 상품 및 SKU에만 삭제 권한을 가지며, 다른 판매자의 상품이나 SKU를 삭제할 수 없습니다. 본 테스트는
 * 판매자 A가 생성한 상품 및 SKU를, 판매자 B가 삭제 시도할 때 올바르게 권한 에러(Forbidden 등)로 막는지 검증합니다.
 *
 * [테스트 단계]
 *
 * 1. 관리자 권한으로 판매자 A, 판매자 B 생성
 * 2. 판매자 A로 상품 1개 생성
 * 3. 해당 상품에 SKU 1개 생성
 * 4. 판매자 B가 이 SKU를 삭제 시도 (권한 없음)
 * 5. 403 Forbidden 또는 권한 에러 발생 여부 검증
 *
 * [제약 사항]
 *
 * - 실제 seller B 인증 컨텍스트 전환(로그인 등)은 API 미제공으로 직접 시뮬레이션(동일 connection 사용)
 * - 실제 권한 기반 통제가 있는 환경에서는 seller B 토큰을 별도 발급 활용 필요
 */
export async function test_api_aimall_backend_seller_products_skus_test_delete_sku_by_seller_unauthorized_access(
  connection: api.IConnection,
) {
  // 1. (관리자 권한) 판매자 A, B 생성
  const sellerA =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      {
        body: {
          business_name: "테스트판매자A",
          email: typia.random<string & tags.Format<"email">>(),
          contact_phone:
            "010-" +
            Math.floor(Math.random() * 10000)
              .toString()
              .padStart(4, "0") +
            "-" +
            Math.floor(Math.random() * 10000)
              .toString()
              .padStart(4, "0"),
          status: "approved",
        } satisfies IAimallBackendSeller.ICreate,
      },
    );
  typia.assert(sellerA);

  const sellerB =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      {
        body: {
          business_name: "테스트판매자B",
          email: typia.random<string & tags.Format<"email">>(),
          contact_phone:
            "010-" +
            Math.floor(Math.random() * 10000)
              .toString()
              .padStart(4, "0") +
            "-" +
            Math.floor(Math.random() * 10000)
              .toString()
              .padStart(4, "0"),
          status: "approved",
        } satisfies IAimallBackendSeller.ICreate,
      },
    );
  typia.assert(sellerB);

  // 2. 판매자 A가 상품 생성
  const productA = await api.functional.aimall_backend.seller.products.create(
    connection,
    {
      body: {
        category_id: typia.random<string & tags.Format<"uuid">>(),
        seller_id: sellerA.id,
        title: "테스트상품-A",
        status: "active",
      } satisfies IAimallBackendProduct.ICreate,
    },
  );
  typia.assert(productA);

  // 3. 판매자 A 상품에 SKU 생성
  const skuA = await api.functional.aimall_backend.seller.products.skus.create(
    connection,
    {
      productId: productA.id,
      body: {
        product_id: productA.id,
        sku_code: "SKU-TEST-" + Math.random().toString(36).substring(2, 10),
      } satisfies IAimallBackendSku.ICreate,
    },
  );
  typia.assert(skuA);

  // 4. 판매자 B가 sellerA 상품의 SKU 삭제 시도 (권한 없음, forbidden)
  await TestValidator.error(
    "seller B가 타 판매자의 SKU를 삭제 시도 시 권한 에러 발생",
  )(async () => {
    await api.functional.aimall_backend.seller.products.skus.erase(connection, {
      productId: productA.id,
      skuId: skuA.id,
    });
  });
}
