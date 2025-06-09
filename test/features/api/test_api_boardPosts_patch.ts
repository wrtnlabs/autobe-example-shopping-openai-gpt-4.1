import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIBoardPost";
import { IBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IBoardPost";

export async function test_api_boardPosts_patch(connection: api.IConnection) {
  const output: IPageIBoardPost = await api.functional.boardPosts.patch(
    connection,
    {
      body: typia.random<IBoardPost.IRequest>(),
    },
  );
  typia.assert(output);
}
