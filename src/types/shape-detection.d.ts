declare interface TextDetectorResult {
  rawValue?: string;
  data?: string;
}

declare interface TextDetector {
  detect(image: ImageBitmapSource): Promise<Array<TextDetectorResult & DOMRectReadOnly>>;
}

declare interface Window {
  TextDetector?: new () => TextDetector;
}

export {};
