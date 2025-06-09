import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { ISellerPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/ISellerPermission";

export async function test_api_sellerPermissions_putById(
  connection: api.IConnection,
) {
  const output: ISellerPermission =
    await api.functional.sellerPermissions.putById(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
      body: typia.random<ISellerPermission.IUpdate>(),
    });
  typia.assert(output);
}
