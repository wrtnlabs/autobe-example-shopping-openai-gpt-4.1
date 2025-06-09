import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageITags } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITags";
import { ITags } from "@ORGANIZATION/PROJECT-api/lib/structures/ITags";

export async function test_api_tags_patch(connection: api.IConnection) {
  const output: IPageITags = await api.functional.tags.patch(connection, {
    body: typia.random<ITags.IRequest>(),
  });
  typia.assert(output);
}
