import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IUserExternalAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IUserExternalAuth";

export async function test_api_userExternalAuths_post(
  connection: api.IConnection,
) {
  const output: IUserExternalAuth = await api.functional.userExternalAuths.post(
    connection,
    {
      body: typia.random<IUserExternalAuth.ICreate>(),
    },
  );
  typia.assert(output);
}
