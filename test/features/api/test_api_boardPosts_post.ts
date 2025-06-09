import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IBoardPost";

export async function test_api_boardPosts_post(connection: api.IConnection) {
  const output: IBoardPost = await api.functional.boardPosts.post(connection, {
    body: typia.random<IBoardPost.ICreate>(),
  });
  typia.assert(output);
}
