import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IBoardPost";

export async function test_api_boardPosts_putById(connection: api.IConnection) {
  const output: IBoardPost = await api.functional.boardPosts.putById(
    connection,
    {
      id: typia.random<string & tags.Format<"uuid">>(),
      body: typia.random<IBoardPost.IUpdate>(),
    },
  );
  typia.assert(output);
}
