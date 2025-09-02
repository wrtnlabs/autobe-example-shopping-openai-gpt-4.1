import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProduct";
import type { IShoppingMallAiBackendProductOptionUnit } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductOptionUnit";
import type { IShoppingMallAiBackendProductOptionUnits } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductOptionUnits";

/**
 * Test unauthorized update of a product option unit (should fail for
 * unauthenticated requests).
 *
 * This test attempts to update a product's option unit using the admin API
 * endpoint without admin authentication. It expects an authorization error
 * to be thrown, confirming that access is denied when Authorization is
 * missing. No actual resource setup is required; random UUIDs are
 * sufficient for path parameters. The test uses random values for
 * productId, optionId, and unitId, and a valid update DTO structure for the
 * request body. Validation succeeds if the API call fails with an
 * authorization error.
 */
export async function test_api_admin_product_option_unit_update_unauthorized_access(
  connection: api.IConnection,
) {
  // Prepare an unauthorized connection by removing any Authorization header
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error(
    "updating product option unit without authentication fails",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.products.options.units.update(
        unauthConn,
        {
          productId: typia.random<string & tags.Format<"uuid">>(),
          optionId: typia.random<string & tags.Format<"uuid">>(),
          unitId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            unit_value: RandomGenerator.paragraph({
              sentences: 1,
              wordMin: 4,
              wordMax: 10,
            }),
            unit_code: RandomGenerator.alphaNumeric(8),
            sort_order: typia.random<number & tags.Type<"int32">>(),
          } satisfies IShoppingMallAiBackendProductOptionUnit.IUpdate,
        },
      );
    },
  );
}
