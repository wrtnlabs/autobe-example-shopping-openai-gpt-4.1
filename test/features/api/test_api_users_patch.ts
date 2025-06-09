import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageUser";
import { IUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IUser";

export async function test_api_users_patch(connection: api.IConnection) {
  const output: IPageUser = await api.functional.users.patch(connection, {
    body: typia.random<IUser.IRequest>(),
  });
  typia.assert(output);
}
