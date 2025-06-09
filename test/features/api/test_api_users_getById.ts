import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IUser";

export async function test_api_users_getById(connection: api.IConnection) {
  const output: IUser = await api.functional.users.getById(connection, {
    id: typia.random<string & tags.Format<"uuid">>(),
  });
  typia.assert(output);
}
