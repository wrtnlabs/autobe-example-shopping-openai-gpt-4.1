import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIUserSession";
import { IUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IUserSession";

export async function test_api_userSessions_patch(connection: api.IConnection) {
  const output: IPageIUserSession = await api.functional.userSessions.patch(
    connection,
    {
      body: typia.random<IUserSession.IRequest>(),
    },
  );
  typia.assert(output);
}
