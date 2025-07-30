import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPageIAimallBackendInventorySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendInventorySnapshot";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAimallBackendInventorySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendInventorySnapshot";

/**
 * 테스트 목적: 존재하지 않는 SKU에 대한 인벤토리 스냅샷 조회 시 404 Not Found 에러가 반환되는지를 검증한다.
 *
 * 비즈니스 맥락:
 *
 * - 관리자 권한 하에서 잘못된/존재하지 않는 SKU ID로 inventory snapshot API를 호출할 때, 시스템이 적절히 404
 *   Not Found 에러를 반환하는지 검증한다.
 * - 이 테스트는 보안 및 API 예외 처리 강인성을 보장하기 위함이다.
 *
 * 테스트 절차:
 *
 * 1. 무작위로 유효한 UUID를 생성한다(존재하지 않는 SKU라고 가정).
 * 2. 해당 SKU ID로 관리자 inventory snapshot API를 호출한다.
 * 3. 404 Not Found 에러(예외)가 발생하는지 TestValidator.error()로 검증한다.
 */
export async function test_api_aimall_backend_administrator_skus_inventorySnapshots_index_test_retrieve_snapshots_for_nonexistent_sku_returns_not_found_error(
  connection: api.IConnection,
) {
  // 1. 무작위 UUID(존재하지 않는 SKU) 준비
  const nonexistentSkuId = typia.random<string & tags.Format<"uuid">>();

  // 2. 인벤토리 스냅샷 조회 시도 및 404 검증
  await TestValidator.error("404 Not Found must be thrown for nonexistent SKU")(
    async () => {
      await api.functional.aimall_backend.administrator.skus.inventorySnapshots.index(
        connection,
        { skuId: nonexistentSkuId },
      );
    },
  );
}
