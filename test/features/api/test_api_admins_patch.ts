import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAdmin";
import { IAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAdmin";

export async function test_api_admins_patch(connection: api.IConnection) {
  const output: IPageIAdmin = await api.functional.admins.patch(connection, {
    body: typia.random<IAdmin.IRequest>(),
  });
  typia.assert(output);
}
