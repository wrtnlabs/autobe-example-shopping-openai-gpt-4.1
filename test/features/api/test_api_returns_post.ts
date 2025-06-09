import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IReturn } from "@ORGANIZATION/PROJECT-api/lib/structures/IReturn";

export async function test_api_returns_post(connection: api.IConnection) {
  const output: IReturn = await api.functional.returns.post(connection, {
    body: typia.random<IReturn.ICreate>(),
  });
  typia.assert(output);
}
