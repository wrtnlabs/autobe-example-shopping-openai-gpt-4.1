import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IBoard } from "@ORGANIZATION/PROJECT-api/lib/structures/IBoard";

export async function test_api_boards_putById(connection: api.IConnection) {
  const output: IBoard = await api.functional.boards.putById(connection, {
    id: typia.random<string & tags.Format<"uuid">>(),
    body: typia.random<IBoard.IUpdate>(),
  });
  typia.assert(output);
}
