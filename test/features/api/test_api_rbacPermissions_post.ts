import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IRbacPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IRbacPermission";

export async function test_api_rbacPermissions_post(
  connection: api.IConnection,
) {
  const output: IRbacPermission = await api.functional.rbacPermissions.post(
    connection,
    {
      body: typia.random<IRbacPermission.ICreate>(),
    },
  );
  typia.assert(output);
}
