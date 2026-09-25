type LogBoxLogInstance = {
  getAvailableStack?: () => unknown;
  getAvailableComponentStack?: () => unknown;
};

type LogBoxLogConstructor = {
  prototype?: LogBoxLogInstance;
};

type LogBoxLogModule = LogBoxLogConstructor & {
  default?: LogBoxLogConstructor;
};

let installed = false;

const toArrayStack = (stack: unknown) => (Array.isArray(stack) ? stack : []);

export const installLogBoxStackGuard = () => {
  if (installed || (typeof __DEV__ !== "undefined" && !__DEV__)) {
    return;
  }

  installed = true;

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const logBoxLogModule = require("react-native/Libraries/LogBox/Data/LogBoxLog") as LogBoxLogModule;
    const LogBoxLog = logBoxLogModule.default ?? logBoxLogModule;
    const prototype = LogBoxLog?.prototype;

    if (!prototype) {
      return;
    }

    if (typeof prototype.getAvailableStack === "function") {
      const getAvailableStack = prototype.getAvailableStack;

      prototype.getAvailableStack = function guardedGetAvailableStack(this: LogBoxLogInstance) {
        return toArrayStack(getAvailableStack.call(this));
      };
    }

    if (typeof prototype.getAvailableComponentStack === "function") {
      const getAvailableComponentStack = prototype.getAvailableComponentStack;

      prototype.getAvailableComponentStack = function guardedGetAvailableComponentStack(this: LogBoxLogInstance) {
        return toArrayStack(getAvailableComponentStack.call(this));
      };
    }
  } catch {
    // LogBox is dev-only; if the internal module path changes, avoid creating a startup error.
  }
};
