# XP-80 Thermal Printer Calibration Guide

## Issue
Receipts are not printing at full 80mm width and the length is cutting off bill items.

## Solution
This guide provides specific steps to configure your XP-80 printer for proper 80mm receipt printing.

## 1. Printer Driver Configuration

### Windows Configuration

1. **Access Printer Properties**
   - Go to Control Panel → Devices and Printers
   - Right-click on XP-80 → Printer Properties

2. **Set Paper Size**
   - Go to "Paper/Quality" tab
   - Set Paper Size to: **Custom 80 x 210 mm**
   - If Custom size is not available, select "Manage Custom Sizes"
   - Create new custom size:
     - Width: 80 mm
     - Height: 210 mm (or taller as needed)
     - Non-Printable margins: All set to 0 mm

3. **Configure Printing Defaults**
   - Click "Printing Defaults" button
   - Set:
     - Paper Size: Custom 80 x 210 mm
     - Print Quality: Normal or 203 DPI
     - Paper Type: Continuous paper

4. **Advanced Settings**
   - Go to "Advanced" tab
   - Set:
     - Paper Size: Custom 80 x 210 mm
     - Print Quality: 203 DPI
     - Enable "Start printing immediately" if available

## 2. Browser Print Settings

### Chrome Settings
1. Press Ctrl+P to open print dialog
2. Select XP-80 as printer
3. Click "More settings"
4. Set:
   - **Margins**: None
   - **Scale**: 100% (try 97-103% if needed)
   - **Pages per sheet**: 1
   - **Paper size**: Custom 80 x 210 mm

### Firefox Settings
1. Press Ctrl+P to open print dialog
2. Select XP-80 as printer
3. Click "More Settings"
4. Set:
   - **Margins**: 0 (Custom margins)
   - **Scale**: 100%
   - **Paper size**: Manage Custom Sizes → 80mm x 210mm

## 3. Command Line Configuration

### Windows PowerShell Commands
```powershell
# Set printer configuration for full width printing
Set-PrintConfiguration -PrinterName "XP-80" -PaperSize "Custom.80x210mm" -MarginsType "Custom" -Margin 0

# Alternative method using printui.dll
rundll32 printui.dll,PrintUIEntry /X /n "XP-80" /?
```

### Linux/CUPS Commands
```bash
# Configure printer for 80mm width
lpadmin -p XP-80 -o media=Custom.80x210mm -o margins=none

# Set as default printer
lpoptions -d XP-80

# Print with specific settings
lp -d XP-80 -o media=Custom.80x210mm -o fit-to-page receipt.html
```

## 4. CSS Media Query Optimization

The updated CSS already includes proper media queries:
```css
@media print {
  @page {
    size: 80mm auto;
    margin: 0mm;
  }
  
  html, body {
    width: 80mm;
    margin: 0;
    padding: 0;
  }
  
  .receipt-container {
    width: 80mm;
  }
  
  .receipt-content {
    width: 80mm;
    max-width: 80mm;
    padding: 5mm 3mm;
  }
}
```

## 5. Printer Hardware Settings

### Adjusting Physical Margins
1. Turn off the printer
2. Access the printer's control panel or configuration menu
3. Look for "Paper Settings" or "Margin Settings"
4. Set:
   - Left Margin: 0 mm
   - Right Margin: 0 mm
   - Top Margin: 3 mm
   - Bottom Margin: 3 mm

### Calibration Process
1. Print a test page
2. Check if content reaches both edges
3. If not, adjust scale by 2-3% increments
4. If content is cut off, decrease scale
5. If there are gaps, increase scale

## 6. Testing Procedure

### Test Print Steps
1. Open receipt page in browser
2. Press Ctrl+P
3. Select XP-80 printer
4. Apply settings:
   - Margins: None
   - Scale: 100%
   - Paper size: Custom 80 x 210 mm
5. Print test receipt
6. Check:
   - Content reaches both edges (full 80mm width)
   - All items are visible (proper length)
   - Text is readable and not cut off

### Adjustment Process
If the receipt still doesn't print correctly:

1. **For width issues**:
   - Increase/decrease scale by 2-3%
   - Check printer's physical margin settings
   - Verify paper size in printer properties

2. **For length issues**:
   - Ensure paper size height is sufficient
   - Check browser's "More settings" for page options
   - Verify CSS has proper height settings

## 7. Common Solutions

### Issue: Content doesn't reach edges
**Solution**:
- Set browser margins to "None"
- Set printer margins to 0mm
- Adjust scale to 103-105%

### Issue: Content gets cut off
**Solution**:
- Set browser margins to "None"
- Set printer margins to 0mm
- Adjust scale to 95-97%

### Issue: Receipt is too long/short
**Solution**:
- Adjust paper height in printer settings
- Modify CSS padding values
- Check for proper line-height settings

## 8. Advanced Troubleshooting

### ESC/POS Commands for Full Width
If using direct ESC/POS printing:
```javascript
// Initialize printer and set full width
const printerCommands = [
  0x1B, 0x40,           // Initialize printer
  0x1D, 0x57, 0x50,     // Set print area width (80mm = 576 dots at 203 DPI)
  0x1B, 0x61, 0x00      // Left alignment for full width
];
```

### JavaScript Print Adjustment
```javascript
// Add this to your print function for better control
window.addEventListener('beforeprint', function() {
  document.body.style.width = '80mm';
  document.body.style.margin = '0';
});
```

## 9. Final Verification Checklist

Before finalizing setup:

1. ✅ Printer driver properly configured for 80mm width
2. ✅ Browser print settings set to "None" margins
3. ✅ Scale set to 100% (adjust as needed)
4. ✅ Paper size set to Custom 80 x 210 mm
5. ✅ CSS includes proper media queries for 80mm
6. ✅ Test print shows content using full width
7. ✅ All receipt items are visible without cutoff
8. ✅ Text is crisp and readable

With these settings, your XP-80 printer should properly print receipts that:
- Use the full 80mm width of the thermal paper
- Show all receipt items without cutting them off
- Have minimal margins on the sides
- Provide optimal readability