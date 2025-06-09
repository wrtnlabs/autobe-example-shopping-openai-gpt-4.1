import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { ITags } from "@ORGANIZATION/PROJECT-api/lib/structures/ITags";

export async function test_api_tags_post(connection: api.IConnection) {
  const output: ITags = await api.functional.tags.post(connection, {
    body: typia.random<ITags.ICreate>(),
  });
  typia.assert(output);
}
