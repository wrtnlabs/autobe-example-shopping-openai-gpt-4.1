import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAdmin";

export async function test_api_admins_getById(connection: api.IConnection) {
  const output: IAdmin = await api.functional.admins.getById(connection, {
    id: typia.random<string & tags.Format<"uuid">>(),
  });
  typia.assert(output);
}
