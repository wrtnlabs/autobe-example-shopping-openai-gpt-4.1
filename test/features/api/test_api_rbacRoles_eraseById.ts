import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IResult";

export async function test_api_rbacRoles_eraseById(
  connection: api.IConnection,
) {
  const output: IResult = await api.functional.rbacRoles.eraseById(connection, {
    id: typia.random<string & tags.Format<"uuid">>(),
  });
  typia.assert(output);
}
