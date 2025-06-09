import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IUserSession";

export async function test_api_userSessions_putById(
  connection: api.IConnection,
) {
  const output: IUserSession = await api.functional.userSessions.putById(
    connection,
    {
      id: typia.random<string & tags.Format<"uuid">>(),
      body: typia.random<IUserSession.IUpdate>(),
    },
  );
  typia.assert(output);
}
