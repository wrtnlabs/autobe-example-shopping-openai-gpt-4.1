import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IRbacPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IRbacPermission";

export async function test_api_rbacPermissions_putById(
  connection: api.IConnection,
) {
  const output: IRbacPermission = await api.functional.rbacPermissions.putById(
    connection,
    {
      id: typia.random<string & tags.Format<"uuid">>(),
      body: typia.random<IRbacPermission.IUpdate>(),
    },
  );
  typia.assert(output);
}
