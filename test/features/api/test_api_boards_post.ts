import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IBoard } from "@ORGANIZATION/PROJECT-api/lib/structures/IBoard";

export async function test_api_boards_post(connection: api.IConnection) {
  const output: IBoard = await api.functional.boards.post(connection, {
    body: typia.random<IBoard.ICreate>(),
  });
  typia.assert(output);
}
