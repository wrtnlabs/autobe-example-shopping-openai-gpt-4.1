import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendProductOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProductOption";

/**
 * 유효성 검증 오류: 필수값 누락 시 관리자 상품 옵션 생성 실패를 검증합니다.
 *
 * 관리자 권한으로 상품 옵션을 생성할 때, 필수 항목(`name` 또는 `value`)을 누락하고 요청하면 API가 엄격하게 유효성 검사를
 * 수행하고, 올바른 에러를 반환하는지 확인합니다. 이 테스트는 잘못된 입력이 실제로 거부되며, 어떤 필드가 필수인지 비즈니스 로직 수준에서
 * 검증함을 보장합니다.
 *
 * 절차:
 *
 * 1. 상품 옵션 생성을 위한 참조 상품을 사전 생성합니다.
 * 2. 관리자 권한으로 필수값(`name`, `value`)을 각각 누락한 옵션 생성 요청을 시도합니다.
 * 3. 각 누락 케이스마다 API가 오류를 발생시키는지, 실제 옵션이 생성되지 않고 검증에 실패하는지 확인합니다.
 *
 * (TypeScript의 타입 시스템 특성상 컴파일 타임엔 오류이므로, 실제 통합 E2E 환경에서는 런타임 검증만 수행합니다.)
 */
export async function test_api_aimall_backend_administrator_products_productOptions_test_admin_create_product_option_with_missing_required_fields(
  connection: api.IConnection,
) {
  // 1. 상품 생성 (옵션 생성을 위한 전제조건)
  const newProduct =
    await api.functional.aimall_backend.administrator.products.create(
      connection,
      {
        body: {
          category_id: typia.random<string & tags.Format<"uuid">>(),
          seller_id: typia.random<string & tags.Format<"uuid">>(),
          title: RandomGenerator.paragraph()(),
          status: "active",
        } satisfies IAimallBackendProduct.ICreate,
      },
    );
  typia.assert(newProduct);

  // 2. (음수 시나리오) name 필드 누락
  await TestValidator.error("필수값 name 누락됨")(async () => {
    await api.functional.aimall_backend.administrator.products.productOptions.create(
      connection,
      {
        productId: newProduct.id,
        body: {
          product_id: newProduct.id,
          // name: 누락 intentionally
          value: "Black",
        } as any, // 실제 오류 테스트 목적, 타입 우회
      },
    );
  });

  // 3. (음수 시나리오) value 필드 누락
  await TestValidator.error("필수값 value 누락됨")(async () => {
    await api.functional.aimall_backend.administrator.products.productOptions.create(
      connection,
      {
        productId: newProduct.id,
        body: {
          product_id: newProduct.id,
          name: "Color",
          // value: 누락 intentionally
        } as any, // 실제 오류 테스트 목적, 타입 우회
      },
    );
  });
}
