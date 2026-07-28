# QR Scanner Installation Instructions

## Required Package Installation

Install the html5-qrcode package for QR code scanning:

```bash
cd client
npm install html5-qrcode
```

Or if using yarn:

```bash
cd client
yarn add html5-qrcode
```

## Package Details

- **html5-qrcode**: A cross-platform HTML5 QR code scanning library
- Works on both mobile and desktop
- Supports camera access and QR code decoding
- No additional dependencies required

## Usage

After installation, the QRScanner component will work with the following features:

1. **Camera Access**: Requests camera permissions
2. **QR Code Detection**: Automatically detects and decodes QR codes
3. **Google Lens-style UI**: Modern scanning interface with animations
4. **Backend Integration**: Automatically calls ticket verification API
5. **Result Display**: Shows verification results with attendee details

## Component Props

```typescript
interface QRScannerProps {
  eventId?: string;      // Optional event ID for context
  onClose?: () => void;  // Callback when scanner is closed
  onScanSuccess?: (result: ScanResult) => void; // Callback on successful scan
}
```

## Example Usage

```tsx
import QRScanner from '@/components/QRScanner/QRScanner';

function CheckinPage() {
  const [showScanner, setShowScanner] = useState(false);

  return (
    <div>
      <button onClick={() => setShowScanner(true)}>
        Open Scanner
      </button>
      
      {showScanner && (
        <QRScanner
          eventId="123"
          onClose={() => setShowScanner(false)}
          onScanSuccess={(result) => {
          }}
        />
      )}
    </div>
  );
}
```

## Features

- ✅ Real-time QR code scanning
- ✅ Camera permission handling
- ✅ Google Lens-style scanning animation
- ✅ Success/failure result display
- ✅ Attendee details after verification
- ✅ Automatic retry after successful scan
- ✅ Error handling and user feedback
- ✅ Mobile-responsive design
- ✅ Dark mode support

## Browser Compatibility

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Permissions

The component requires camera permissions. Users will be prompted to allow camera access when the scanner is opened.
