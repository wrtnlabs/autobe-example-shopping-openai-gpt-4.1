import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { ISellerPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/ISellerPermission";

export async function test_api_sellerPermissions_post(
  connection: api.IConnection,
) {
  const output: ISellerPermission = await api.functional.sellerPermissions.post(
    connection,
    {
      body: typia.random<ISellerPermission.ICreate>(),
    },
  );
  typia.assert(output);
}
