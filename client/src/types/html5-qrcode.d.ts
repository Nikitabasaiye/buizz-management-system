declare module 'html5-qrcode' {
  export class Html5Qrcode {
    constructor(elementId: string);
    start(
      cameraConfig: { facingMode?: string },
      config: any,
      onScanSuccess: (decodedText: string, decodedResult: any) => void,
      onScanFailure: (error: string) => void
    ): Promise<void>;
    stop(): Promise<void>;
    scanFile(
      file: File,
      onScanSuccess: (decodedText: string, decodedResult: any) => void,
      onScanFailure: (error: string) => void
    ): Promise<void>;
    clear(): Promise<void>;
    isScanning: boolean;
  }

  export class Html5QrcodeScanner {
    constructor(elementId: string, config?: any, verbose?: boolean);
    render(onScanSuccess: (decodedText: string, decodedResult: any) => void, onScanFailure?: (error: string) => void): void;
    clear(): Promise<void>;
  }

  export enum Html5QrcodeSupportedFormats {
    QR_CODE = 0,
    AZTEC = 1,
    CODABAR = 2,
    CODE_39 = 3,
    CODE_93 = 4,
    CODE_128 = 5,
    DATA_MATRIX = 6,
    MAXICODE = 7,
    ITF = 8,
    EAN_13 = 9,
    EAN_8 = 10,
    PDF_417 = 11,
    RSS_14 = 12,
    RSS_EXPANDED = 13,
    UPC_A = 14,
    UPC_E = 15,
    BARCODE = 16
  }
}
