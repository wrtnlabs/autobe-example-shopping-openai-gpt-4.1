import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSku";

/**
 * 성공적인 SKU 수정 시나리오를 검증합니다.
 *
 * 관리자로서 기존 상품에 소속된 SKU의 업데이트 가능한 필드(예: sku_code)를 수정합니다. 이 때 수정 내용이 정확히 반영되는지,
 * 그리고 SKU code가 해당 상품 내에서 유일하게 유지되는지 비즈니스 제약조건이 지켜지는지 확인해야 합니다.
 *
 * 1. SKU를 연결할 Product를 생성합니다. (의존성)
 * 2. 해당 Product에 연결된 SKU를 생성합니다. (의존성)
 * 3. SKU의 sku_code 값을 새로운(충돌 없는) 값으로 수정합니다.
 * 4. SKU의 sku_code가 정상적으로 반영됐는지 검증합니다.
 * 5. (유니크 제약조건 검증) 동일 product에 중복 sku_code로 업데이트 시 오류가 발생하는지 확인합니다.
 */
export async function test_api_aimall_backend_administrator_skus_test_update_sku_success(
  connection: api.IConnection,
) {
  // 1. SKU를 연결할 Product 생성
  const product =
    await api.functional.aimall_backend.administrator.products.create(
      connection,
      {
        body: {
          category_id: typia.random<string & tags.Format<"uuid">>(),
          seller_id: typia.random<string & tags.Format<"uuid">>(),
          title: RandomGenerator.paragraph()(),
          description: RandomGenerator.content()()(),
          main_thumbnail_uri: undefined,
          status: "active",
        } satisfies IAimallBackendProduct.ICreate,
      },
    );
  typia.assert(product);

  // 2. SKU 생성
  const sku = await api.functional.aimall_backend.administrator.skus.create(
    connection,
    {
      body: {
        product_id: product.id,
        sku_code: RandomGenerator.alphaNumeric(10),
      } satisfies IAimallBackendSku.ICreate,
    },
  );
  typia.assert(sku);

  // 3. SKU의 sku_code 값 업데이트(새 값)
  const newSkuCode = RandomGenerator.alphaNumeric(12);
  const updatedSku =
    await api.functional.aimall_backend.administrator.skus.update(connection, {
      skuId: sku.id,
      body: { sku_code: newSkuCode } satisfies IAimallBackendSku.IUpdate,
    });
  typia.assert(updatedSku);

  // 4. sku_code 반영 여부 확인
  TestValidator.equals("sku_code is updated")(updatedSku.sku_code)(newSkuCode);

  // 5. 중복 sku_code로 업데이트 시 에러 발생 검증
  const sku2 = await api.functional.aimall_backend.administrator.skus.create(
    connection,
    {
      body: {
        product_id: product.id,
        sku_code: RandomGenerator.alphaNumeric(15),
      } satisfies IAimallBackendSku.ICreate,
    },
  );
  typia.assert(sku2);

  await TestValidator.error("sku_code unique constraint violation")(
    async () => {
      await api.functional.aimall_backend.administrator.skus.update(
        connection,
        {
          skuId: sku2.id,
          body: { sku_code: newSkuCode },
        },
      );
    },
  );
}
