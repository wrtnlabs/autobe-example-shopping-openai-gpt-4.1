import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IUserSession";

export async function test_api_userSessions_post(connection: api.IConnection) {
  const output: IUserSession = await api.functional.userSessions.post(
    connection,
    {
      body: typia.random<IUserSession.ICreate>(),
    },
  );
  typia.assert(output);
}
