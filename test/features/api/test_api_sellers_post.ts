import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { ISeller } from "@ORGANIZATION/PROJECT-api/lib/structures/ISeller";

export async function test_api_sellers_post(connection: api.IConnection) {
  const output: ISeller = await api.functional.sellers.post(connection, {
    body: typia.random<ISeller.ICreate>(),
  });
  typia.assert(output);
}
