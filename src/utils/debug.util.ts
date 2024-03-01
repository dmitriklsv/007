// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const debugLogs = (message?: any, ...optionalParams: any[]): void => {
  if (process.env.DEBUG === "1") {
    console.log(message, ...optionalParams);
  }
  return;
};
