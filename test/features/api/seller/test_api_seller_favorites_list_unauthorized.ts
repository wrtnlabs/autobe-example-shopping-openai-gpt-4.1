import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendSeller";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendFavorite } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendFavorite";
import type { IPageIShoppingMallAiBackendFavorite } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendFavorite";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function test_api_seller_favorites_list_unauthorized(
  connection: api.IConnection,
) {
  /**
   * 인증 없이 판매자 즐겨찾기 목록(PATCH /shoppingMallAiBackend/seller/favorites) 조회 시도를 검증.
   *
   * 1. 인증되지 않은 connection으로 PATCH /shoppingMallAiBackend/seller/favorites 를 호출한다.
   *
   *    - Body는 빈 객체 또는 적절한(IShoppingMallAiBackendFavorite.IRequest) 타입을 사용.
   *    - 반드시 인증 헤더가 없는 connection을 사용(authorization 직접 조작 없이 headers: {}를 전달).
   * 2. 호출 결과 인증 오류(Unauthorized/Forbidden) 발생 여부를 TestValidator.error로 검증한다.
   * 3. 인증 방어가 제대로 이뤄졌는지 확인한다. 추가 비정상 반환, 성공 반환 시 실패 처리된다.
   */
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error(
    "비인증자로 판매자 즐겨찾기 목록을 조회하면 인증 오류가 발생해야 한다",
    async () => {
      await api.functional.shoppingMallAiBackend.seller.favorites.index(
        unauthConn,
        { body: {} satisfies IShoppingMallAiBackendFavorite.IRequest },
      );
    },
  );
}
