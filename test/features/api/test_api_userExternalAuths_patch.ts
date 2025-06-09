import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIUserExternalAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIUserExternalAuth";
import { IUserExternalAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IUserExternalAuth";

export async function test_api_userExternalAuths_patch(
  connection: api.IConnection,
) {
  const output: IPageIUserExternalAuth =
    await api.functional.userExternalAuths.patch(connection, {
      body: typia.random<IUserExternalAuth.IRequest>(),
    });
  typia.assert(output);
}
