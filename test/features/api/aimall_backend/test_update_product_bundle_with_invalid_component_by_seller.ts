import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSeller";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendProductBundle } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProductBundle";

/**
 * Validate that sellers cannot update product bundles to include products they
 * do not own.
 *
 * This test ensures that the API enforces business rules restricting sellers to
 * only bundle their own products as components within a bundle. The workflow
 * involves creating a seller, registering some products for that seller,
 * creating an additional product as an "invalid" component (owned by a
 * different seller or by the admin), then creating a valid bundle for the
 * seller. The test attempts to update the product bundle to set its component
 * to the "invalid" product and expects the operation to be rejected with an
 * error (authorization or business rule violation).
 *
 * ⚠️ BUT: 현재 API의 IUpdate DTO는 component_product_id 값을 변경할 수 없으므로, 실제로 본 테스트
 * 시나리오(구성품을 외부 상품으로 변경)는 구현이 불가능합니다. API 구조상 is_required, quantity만 업데이트 가능하고
 * 구성품 교체는 지원하지 않습니다.
 *
 * 따라서, 아래 테스트는 전체 사전 조건 및 번들 생성까지 실제 비즈니스 플로우는 완벽히 재현하였으나, 구성품 변경 시도(및 그것의
 * forbidden validation)는 API/DTO 제약으로 omit 했음을 명확히 밝혀둡니다.
 *
 * [테스트 순서]
 *
 * 1. 판매자 계정(admin으로 생성)
 * 2. 판매자 본인 상품 등록
 * 3. 외부 상품(타 seller 또는 admin 소유) 등록
 * 4. 판매자 상품 번들 valid 구성 생성
 * 5. 구성품 변경 forbidden 시도(미구현: DTO 제약)
 */
export async function test_api_aimall_backend_test_update_product_bundle_with_invalid_component_by_seller(
  connection: api.IConnection,
) {
  // 1. 판매자 계정(admin으로 생성)
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

  // 2. 판매자 본인 상품 등록
  const category_id = typia.random<string & tags.Format<"uuid">>();
  const sellerProduct =
    await api.functional.aimall_backend.seller.products.create(connection, {
      body: {
        category_id,
        seller_id: seller.id,
        title: RandomGenerator.paragraph()(),
        status: "active",
      },
    });
  typia.assert(sellerProduct);

  // 3. 외부 상품(타 seller/관리자 소유) 등록
  const invalidProduct =
    await api.functional.aimall_backend.administrator.products.create(
      connection,
      {
        body: {
          category_id: typia.random<string & tags.Format<"uuid">>(),
          seller_id: typia.random<string & tags.Format<"uuid">>(), // 실제 seller.id와 다르게 생성
          title: RandomGenerator.paragraph()(),
          status: "active",
        },
      },
    );
  typia.assert(invalidProduct);

  // 4. 판매자 상품 번들 valid 구성 생성
  const componentProduct =
    await api.functional.aimall_backend.seller.products.create(connection, {
      body: {
        category_id,
        seller_id: seller.id,
        title: RandomGenerator.name(),
        status: "active",
      },
    });
  typia.assert(componentProduct);

  const bundle =
    await api.functional.aimall_backend.seller.products.productBundles.create(
      connection,
      {
        productId: sellerProduct.id,
        body: {
          bundle_product_id: sellerProduct.id,
          component_product_id: componentProduct.id,
          is_required: true,
          quantity: 1,
        },
      },
    );
  typia.assert(bundle);

  // 5. 구성품 변경 forbidden 시도(불가: update DTO constraints)
  // => IUpdate DTO에는 component_product_id가 없으므로, 본 테스트 목적상 forbidden validation은 구현 불가.
  // 추후 productBundles.update API의 DTO/scenario가 확장되면 여기서 validation 추가 필요.
}
