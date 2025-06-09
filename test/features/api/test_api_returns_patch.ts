import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIReturn } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIReturn";
import { IReturn } from "@ORGANIZATION/PROJECT-api/lib/structures/IReturn";

export async function test_api_returns_patch(connection: api.IConnection) {
  const output: IPageIReturn = await api.functional.returns.patch(connection, {
    body: typia.random<IReturn.IRequest>(),
  });
  typia.assert(output);
}
