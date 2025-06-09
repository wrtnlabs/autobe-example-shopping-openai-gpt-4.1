import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IBoardThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IBoardThread";

export async function test_api_boardThreads_putById(
  connection: api.IConnection,
) {
  const output: IBoardThread = await api.functional.boardThreads.putById(
    connection,
    {
      id: typia.random<string & tags.Format<"uuid">>(),
      body: typia.random<IBoardThread.IUpdate>(),
    },
  );
  typia.assert(output);
}
