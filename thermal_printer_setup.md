# Thermal Printer Setup for XP-80 (80mm Receipt Printer)

## Problem
Receipts are printing with narrow content and empty margins on both sides instead of using the full 80mm width of the paper.

## Solution Overview
To make receipts print at full width, we need to adjust:
1. Browser print settings
2. Printer driver settings
3. System print settings
4. CSS print styles (already implemented in the new design)

## 1. Browser Print Settings

### Chrome/Chromium
1. When printing, click "More settings"
2. Set the following options:
   - **Margins**: None or Custom (set to 0)
   - **Scale**: 100% (may need to adjust between 95-105% for perfect fit)
   - **Pages per sheet**: 1
   - **Paper size**: Custom 80 x 210 mm

### Firefox
1. In print dialog, click "More Settings"
2. Set:
   - **Margins**: 0 (Custom margins)
   - **Scale**: 100%
   - **Paper size**: Manage Custom Sizes → Create new: 80mm x 210mm

## 2. Printer Driver Settings (Windows)

### Installing/Updating XP-80 Driver
1. Download the latest XP-80 driver from the manufacturer's website
2. Install the driver with these settings:
   - **Paper Size**: 80mm x 210mm (or 80mm x 297mm for longer receipts)
   - **Paper Type**: Continuous paper (thermal paper)
   - **Print Quality**: Select appropriate DPI (203 DPI is standard)

### Configuring Printer Properties
1. Go to Control Panel → Devices and Printers
2. Right-click on XP-80 printer → Printer Properties
3. In "Paper/Quality" tab:
   - **Paper Size**: Custom 80 x 210 mm
   - **Paper Type**: Label/Continuous
   - **Print Quality**: Normal or High Speed
4. In "Advanced" tab:
   - **Paper Size**: 80mm x 210mm
   - **Paper Type**: Continuous
   - Click "Printing Defaults" and set the same values

## 3. Command Line Printer Configuration

### For Windows using PowerShell
```powershell
# Set printer preferences for XP-80
Set-PrintConfiguration -PrinterName "XP-80" -PaperSize "Custom.80x210mm" -MarginsType "Custom" -Margin 0

# Alternative using rundll32 (Windows only)
rundll32 printui.dll,PrintUIEntry /X /n "XP-80" /?
```

### For Linux/CUPS
```bash
# Add printer with proper settings
lpadmin -p XP-80 -E -v usb://XP-80 -m everywhere
lpadmin -p XP-80 -o media=Custom.80x210mm -o margins=none

# Set as default printer
lpoptions -d XP-80

# Print with specific settings
lp -d XP-80 -o media=Custom.80x210mm -o fit-to-page test.html
```

## 4. CSS Print Optimization (Already Implemented)

The new CSS file includes optimized print styles:
```css
@media print {
  @page {
    size: 80mm auto;
    margin: 0mm;
  }
  
  body {
    margin: 0;
    padding: 0;
  }
  
  .receipt-container {
    width: 80mm;
    min-height: 100vh;
    margin: 0;
    padding: 0;
  }
  
  .receipt-content {
    padding: 5mm 3mm;
    width: 100%;
    max-width: 100%;
  }
}
```

## 5. Testing and Calibration

### Print Test Procedure
1. Open the receipt page in your browser
2. Press Ctrl+P to open print dialog
3. Select XP-80 printer
4. Apply these settings:
   - **Margins**: None
   - **Scale**: 100%
   - **Options**: 
     - Disable "Headers and footers"
     - Disable "Background graphics" if not needed
5. Print a test receipt

### Calibration Steps
If the receipt still doesn't fit perfectly:

1. **Adjust Scale**:
   - Try 95%, 97%, 100%, 103%, 105% to find the perfect fit

2. **Adjust Margins**:
   - Set custom margins to 0mm or very small values (1-2mm)

3. **Check Paper Size**:
   - Ensure printer is set to 80mm width
   - Verify in printer properties

## 6. Common Issues and Solutions

### Issue: Receipt prints too narrow
**Solution**: 
- Increase scale to 103-105%
- Set margins to None/0
- Check CSS has correct width (80mm)

### Issue: Text gets cut off on edges
**Solution**:
- Decrease scale to 95-97%
- Add small padding (2-3mm) to receipt content
- Check printer's physical margins

### Issue: Printer feeds too much paper
**Solution**:
- In printer properties, set correct paper length
- Adjust "Page length" setting in driver
- Modify CSS to reduce height with `height: auto`

## 7. Advanced Configuration for XP-80

### ESC/POS Commands (if using direct printing)
If you're using direct ESC/POS commands for printing:

```javascript
// Set print area to full width
const initPrinter = [
  0x1B, 0x40,           // Initialize printer
  0x1D, 0x57, 0x50,     // Set print area width (80mm = 576 dots at 203 DPI)
  0x1B, 0x61, 0x01      // Center alignment
];

// Send to printer
// (Implementation depends on your printing method)
```

## 8. Browser-Specific Tips

### Chrome
- Type `chrome://settings/` in address bar
- Search for "Printing"
- Enable "Disable PDF and Cloud printing" if needed
- Set default print settings

### Firefox
- Type `about:preferences#general` in address bar
- Scroll to "Applications"
- Set PDF viewer to "Ask to save" or "Use Firefox"

## 9. Troubleshooting Checklist

1. ✅ Printer driver is correctly installed
2. ✅ Paper size set to 80mm in printer properties
3. ✅ Browser print settings: Margins = None, Scale = 100%
4. ✅ CSS has correct media queries for 80mm width
5. ✅ Test print shows content using full width
6. ✅ No text is cut off at edges
7. ✅ Proper line spacing and readability

## 10. Final Recommendations

1. **Test with various receipt lengths** to ensure proper paper feeding
2. **Keep a few test receipts** for quick verification after any system updates
3. **Document your exact settings** for future reference
4. **Consider using a print management tool** for consistent results across multiple workstations
5. **Regularly update printer drivers** to ensure compatibility and optimal performance

With these settings, your XP-80 thermal printer should print receipts that use the full 80mm width with no unnecessary margins on the sides.