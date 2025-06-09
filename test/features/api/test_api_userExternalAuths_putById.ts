import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IUserExternalAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IUserExternalAuth";

export async function test_api_userExternalAuths_putById(
  connection: api.IConnection,
) {
  const output: IUserExternalAuth =
    await api.functional.userExternalAuths.putById(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
      body: typia.random<IUserExternalAuth.IUpdate>(),
    });
  typia.assert(output);
}
