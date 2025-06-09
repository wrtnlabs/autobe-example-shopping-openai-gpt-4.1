import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { ITags } from "@ORGANIZATION/PROJECT-api/lib/structures/ITags";

export async function test_api_tags_eraseById(connection: api.IConnection) {
  const output: ITags = await api.functional.tags.eraseById(connection, {
    id: typia.random<string & tags.Format<"uuid">>(),
  });
  typia.assert(output);
}
