import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IBoardPost";

export async function test_api_boardPosts_getById(connection: api.IConnection) {
  const output: IBoardPost = await api.functional.boardPosts.getById(
    connection,
    {
      id: typia.random<string & tags.Format<"uuid">>(),
    },
  );
  typia.assert(output);
}
