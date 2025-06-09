import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IUserExternalAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IUserExternalAuth";

export async function test_api_userExternalAuths_getById(
  connection: api.IConnection,
) {
  const output: IUserExternalAuth =
    await api.functional.userExternalAuths.getById(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
    });
  typia.assert(output);
}
