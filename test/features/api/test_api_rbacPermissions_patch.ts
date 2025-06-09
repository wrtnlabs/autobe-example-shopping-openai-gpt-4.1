import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIRbacPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRbacPermission";
import { IRbacPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IRbacPermission";

export async function test_api_rbacPermissions_patch(
  connection: api.IConnection,
) {
  const output: IPageIRbacPermission =
    await api.functional.rbacPermissions.patch(connection, {
      body: typia.random<IRbacPermission.IRequest>(),
    });
  typia.assert(output);
}
