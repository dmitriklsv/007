import { Command, CommandRunner } from "nest-commander";

@Command({
  name: "hi"
})
export class BasicConsole extends CommandRunner {
  constructor() {
    super();
  }

  async run(): Promise<void> {}
}
