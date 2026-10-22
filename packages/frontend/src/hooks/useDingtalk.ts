const isMock = import.meta.env.VITE_MOCK_DINGTALK === "true";

export interface DingtalkSDK {
  getAuthCode(): Promise<string>;
  ready(): Promise<void>;
}

const realSDK: DingtalkSDK = {
  async ready() {
    return new Promise<void>((resolve) => {
      const dd = (window as unknown as Record<string, unknown>).dd as
        | { ready: (cb: () => void) => void }
        | undefined;
      if (dd?.ready) {
        dd.ready(resolve);
      } else {
        setTimeout(resolve, 500);
      }
    });
  },
  async getAuthCode() {
    await this.ready();
    return new Promise<string>((resolve, reject) => {
      const dd = (window as unknown as Record<string, unknown>).dd as {
        runtime?: {
          permission?: {
            requestAuthCode?: (opts: {
              clientId: string;
              corpId: string;
              onSuccess: (res: { code: string }) => void;
              onFail: (err: Error) => void;
            }) => void;
          };
        };
      };
      if (dd?.runtime?.permission?.requestAuthCode) {
        const corpId =
          new URLSearchParams(window.location.search).get("corpid") ||
          import.meta.env.VITE_DINGTALK_CORP_ID ||
          "";
        dd.runtime.permission.requestAuthCode({
          clientId: import.meta.env.VITE_DINGTALK_CLIENT_ID || "",
          corpId,
          onSuccess: (res) => resolve(res.code),
          onFail: (err) => reject(err),
        });
      } else {
        reject(new Error("钉钉 SDK 不可用"));
      }
    });
  },
};

const mockSDK: DingtalkSDK = {
  async ready() {},
  async getAuthCode() {
    return "mock_dev_code_" + Date.now();
  },
};

export function useDingtalk() {
  return isMock ? mockSDK : realSDK;
}

export function isMockMode(): boolean {
  return isMock;
}
