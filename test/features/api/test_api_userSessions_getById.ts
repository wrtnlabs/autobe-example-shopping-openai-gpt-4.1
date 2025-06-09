import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IUserSession";

export async function test_api_userSessions_getById(
  connection: api.IConnection,
) {
  const output: IUserSession = await api.functional.userSessions.getById(
    connection,
    {
      id: typia.random<string & tags.Format<"uuid">>(),
    },
  );
  typia.assert(output);
}
