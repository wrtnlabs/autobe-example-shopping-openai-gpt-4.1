import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAdmin";

export async function test_api_admins_eraseById(connection: api.IConnection) {
  const output: IAdmin = await api.functional.admins.eraseById(connection, {
    id: typia.random<string & tags.Format<"uuid">>(),
  });
  typia.assert(output);
}
