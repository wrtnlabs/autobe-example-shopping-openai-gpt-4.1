import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageISellerPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageISellerPermission";
import { ISellerPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/ISellerPermission";

export async function test_api_sellerPermissions_patch(
  connection: api.IConnection,
) {
  const output: IPageISellerPermission =
    await api.functional.sellerPermissions.patch(connection, {
      body: typia.random<ISellerPermission.IRequest>(),
    });
  typia.assert(output);
}
