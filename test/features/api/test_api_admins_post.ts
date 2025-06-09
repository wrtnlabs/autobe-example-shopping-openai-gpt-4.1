import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAdmin";

export async function test_api_admins_post(connection: api.IConnection) {
  const output: IAdmin = await api.functional.admins.post(connection, {
    body: typia.random<IAdmin.ICreate>(),
  });
  typia.assert(output);
}
