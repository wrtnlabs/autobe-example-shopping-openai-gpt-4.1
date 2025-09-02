import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendProductTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductTag";

export async function test_api_product_tag_update_failure_unauthorized(
  connection: api.IConnection,
) {
  /**
   * Validate that updating a product tag without admin authentication is
   * forbidden.
   *
   * This test simulates a scenario where a client attempts to perform an update
   * on a product tag using the /shoppingMallAiBackend/admin/productTags/:tagId
   * endpoint WITHOUT any admin authentication or prior login. Only
   * authenticated administrators should be able to execute this API; any
   * unauthenticated request must be denied (typically as HTTP 401
   * Unauthorized).
   *
   * Steps:
   *
   * 1. Prepare an unauthenticated connection by explicitly omitting any
   *    Authorization header.
   * 2. Attempt to update a product tag using a random tagId and minimal update
   *    payload.
   * 3. Expect the API call to throw an error due to missing authentication.
   */
  const unauthConnection: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error(
    "update requires admin authentication",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.productTags.update(
        unauthConnection,
        {
          tagId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            tag_name: RandomGenerator.name(2),
            tag_code: RandomGenerator.alphabets(10),
          } satisfies IShoppingMallAiBackendProductTag.IUpdate,
        },
      );
    },
  );
}
