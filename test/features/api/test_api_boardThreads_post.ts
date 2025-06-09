import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IBoardThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IBoardThread";

export async function test_api_boardThreads_post(connection: api.IConnection) {
  const output: IBoardThread = await api.functional.boardThreads.post(
    connection,
    {
      body: typia.random<IBoardThread.ICreate>(),
    },
  );
  typia.assert(output);
}
