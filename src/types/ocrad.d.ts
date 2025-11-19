type OcradOptions = {
  numeric?: boolean;
  async?: boolean;
  filter?: boolean;
};

type OcradFunction = (image: HTMLCanvasElement | HTMLImageElement | ImageData, options?: OcradOptions) => string;

declare global {
  interface Window {
    OCRAD?: OcradFunction;
  }
}

export {};
