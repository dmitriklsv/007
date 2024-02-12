### Prerequisites

- Node 18, pnpm

### Architecture

The system for data exchange between frontend and smart contract

# For frontendside

The server reicives http request and validates payload, query,... from client by extractor ( validated by zod https://zod.dev/), and implenments sercurity if authentication required by guard. After validating, the validated payload is transform from controller to Service class that executes some logic and maybe accesses to Repository which includes the methods for working with database. After all, the controller returns hhtp response to the client if available.

# For blockchainside,

The server querys data and listening event stream from contract, parses this data and store to database.
