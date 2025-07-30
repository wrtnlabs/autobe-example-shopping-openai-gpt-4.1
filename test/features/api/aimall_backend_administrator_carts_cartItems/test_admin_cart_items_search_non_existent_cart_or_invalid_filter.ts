import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCartItem";
import type { IPageIAimallBackendCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendCartItem";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * 존재하지 않는 cartId 또는 잘못된 타입의 필터로 어드민 장바구니 아이템 목록 검색 시 올바른 오류 반환 확인
 *
 * - 관리자가 존재하지 않는 cartId로 아이템 검색을 시도할 때 404 Not Found 오류가 반환되는지 검증합니다.
 * - 필터(검색 body)에 명확히 잘못된 타입(ex. created_at_from에 숫자)을 입력했을 때 422 Unprocessable
 *   Entity 오류가 반환되는지 검증합니다.
 * - 두 경우 모두, 에러 응답에 민감 정보(구체 에러 메시지·내부 정보 노출 등)가 포함되어 있지 않은지 확인합니다.
 *
 * 테스트 순서:
 *
 * 1. 임의의 비존재 cartId(uuid)로 검색 요청 및 404 검증
 * 2. 정상 cartId이지만 필터 값에 타입 오류 입력 시 422 검증
 */
export async function test_api_aimall_backend_administrator_carts_cartItems_search_non_existent_cart_or_invalid_filter(
  connection: api.IConnection,
) {
  // 1. 존재하지 않는 cartId로 검색 요청 → 404 오류 검증
  const nonExistentCartId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const validBody: IAimallBackendCartItem.IRequest = {
    cart_id: nonExistentCartId,
    limit: 1,
    page: 1,
  };
  await TestValidator.error(
    "존재하지 않는 cartId는 404 반환해야 하며 민감정보 노출 없음",
  )(async () => {
    await api.functional.aimall_backend.administrator.carts.cartItems.search(
      connection,
      {
        cartId: nonExistentCartId,
        body: validBody,
      },
    );
  });

  // 2. 정상 cartId + 잘못된 타입의 필터 값(예: created_at_from 숫자→string 아님) → 422 오류 검증
  const validCartId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const invalidBody: IAimallBackendCartItem.IRequest = {
    cart_id: validCartId,
    created_at_from: 12345 as unknown as string & tags.Format<"date-time">, // 일부러 타입 오류 유발
    limit: 1,
    page: 1,
  };
  await TestValidator.error(
    "잘못된 타입의 필터로 422 반환, 민감정보 노출 없음",
  )(async () => {
    await api.functional.aimall_backend.administrator.carts.cartItems.search(
      connection,
      {
        cartId: validCartId,
        body: invalidBody,
      },
    );
  });
}
