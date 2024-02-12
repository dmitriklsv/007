import { Command, CommandRunner } from "nest-commander";

@Command({
  name: "hi"
})
export class BasicConsole extends CommandRunner {
  constructor() {
    super();
  }

  async run(): Promise<void> {
    await new Promise(res => setTimeout(res, 1000));

    console.log("hello kitty");
  }
}
