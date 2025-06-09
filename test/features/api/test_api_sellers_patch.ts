import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageISeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageISeller";
import { ISeller } from "@ORGANIZATION/PROJECT-api/lib/structures/ISeller";

export async function test_api_sellers_patch(connection: api.IConnection) {
  const output: IPageISeller = await api.functional.sellers.patch(connection, {
    body: typia.random<ISeller.IRequest>(),
  });
  typia.assert(output);
}
