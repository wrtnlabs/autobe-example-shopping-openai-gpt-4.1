import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendSeller";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendProductOptions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductOptions";

export async function test_api_seller_product_option_creation_unauthorized_failure(
  connection: api.IConnection,
) {
  /**
   * 인증 또는 seller 권한 없이 상품 옵션 그룹 생성 시도 시 권한 오류가 반드시 발생함을 검증한다.
   *
   * 1. 인증(Authorization)이 없는 connection을 새로 생성한다.
   * 2. 무작위 productId(UUID)와 옵션 데이터로 옵션 생성 API를 호출한다.
   * 3. 권한 오류(401 또는 403 등)가 반드시 반환되는지 TestValidator.error로 확인한다.
   */
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  const productId = typia.random<string & tags.Format<"uuid">>();
  const requestBody = {
    option_name: RandomGenerator.paragraph({
      sentences: 1,
      wordMin: 4,
      wordMax: 12,
    }),
    required: true,
    sort_order: typia.random<number & tags.Type<"int32">>(),
  } satisfies IShoppingMallAiBackendProductOptions.ICreate;

  await TestValidator.error(
    "seller 인증 없이 상품 옵션 그룹 생성 요청은 반드시 실패해야 함",
    async () => {
      await api.functional.shoppingMallAiBackend.seller.products.options.create(
        unauthConn,
        { productId, body: requestBody },
      );
    },
  );
}
