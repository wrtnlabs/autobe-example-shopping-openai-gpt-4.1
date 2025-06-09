import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { ISellerPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/ISellerPermission";

export async function test_api_sellerPermissions_eraseById(
  connection: api.IConnection,
) {
  const output: ISellerPermission =
    await api.functional.sellerPermissions.eraseById(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
    });
  typia.assert(output);
}
