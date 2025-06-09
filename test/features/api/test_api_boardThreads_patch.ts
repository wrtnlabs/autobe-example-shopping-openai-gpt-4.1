import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIBoardThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIBoardThread";
import { IBoardThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IBoardThread";

export async function test_api_boardThreads_patch(connection: api.IConnection) {
  const output: IPageIBoardThread = await api.functional.boardThreads.patch(
    connection,
    {
      body: typia.random<IBoardThread.IRequest>(),
    },
  );
  typia.assert(output);
}
