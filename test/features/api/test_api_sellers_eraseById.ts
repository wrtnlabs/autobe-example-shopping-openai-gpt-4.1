import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { ISeller } from "@ORGANIZATION/PROJECT-api/lib/structures/ISeller";

export async function test_api_sellers_eraseById(connection: api.IConnection) {
  const output: ISeller.ISoftDeleteResult =
    await api.functional.sellers.eraseById(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
    });
  typia.assert(output);
}
