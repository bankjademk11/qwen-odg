# XP-80 Thermal Printer Setup Guide for Windows

## Overview
This guide provides step-by-step instructions for configuring your XP-80 thermal printer on Windows to print receipts at full 80mm width without cutting off content.

## Prerequisites
- Windows 10 or 11
- XP-80 thermal printer
- USB cable or network connection to printer
- Administrator privileges on the computer

## Step 1: Install Printer Driver

### Download Driver
1. Visit the XP-80 manufacturer's website
2. Navigate to Support/Downloads section
3. Find XP-80 driver for Windows
4. Download the latest driver package

### Install Driver
1. Extract the downloaded file
2. Run the setup executable as Administrator
3. Follow installation wizard:
   - Accept license agreement
   - Select connection type (USB or Network)
   - Choose printer model (XP-80)
   - Complete installation

## Step 2: Configure Printer Properties

### Access Printer Properties
1. Open **Control Panel**
2. Go to **Devices and Printers**
3. Find **XP-80** in the list
4. Right-click on the printer icon
5. Select **Printer Properties**

### Set Paper Size
1. In Printer Properties window, go to **Paper/Quality** tab
2. Under Paper Size, select **Custom**
3. Click **Manage Custom Sizes**
4. Create new custom size:
   - Name: `80mm Receipt`
   - Width: `80` mm
   - Height: `210` mm
   - Non-Printable margins: All set to `0` mm
5. Click **Save**

### Configure Printing Preferences
1. In Printer Properties, click **Printing Preferences**
2. Go to **Paper/Quality** tab
3. Set:
   - Paper Size: `80mm Receipt` (the custom size you just created)
   - Print Quality: `Normal` or `203 DPI`
   - Paper Type: `Continuous paper`
4. Go to **Layout** tab (if available)
   - Set margins to minimum values
5. Click **Apply** then **OK**

### Set as Default Printer
1. In Devices and Printers window
2. Right-click on XP-80 printer
3. Select **Set as default printer**

## Step 3: Configure Advanced Printer Settings

### Access Advanced Settings
1. In Printer Properties window
2. Go to **Advanced** tab
3. Set:
   - Paper Size: `80mm Receipt`
   - Print Quality: `203 DPI`
   - Spool Settings: Check "Start printing immediately"

### Configure Printing Defaults
1. In Printer Properties window
2. Click **Printing Defaults**
3. Set same values as Printing Preferences:
   - Paper Size: `80mm Receipt`
   - Print Quality: `Normal` or `203 DPI`
   - Paper Type: `Continuous paper`
4. Click **OK**

## Step 4: Browser Configuration

### Chrome Configuration
1. Open Chrome browser
2. Navigate to your receipt page
3. Press **Ctrl+P** to open print dialog
4. Select **XP-80** as destination printer
5. Click **More settings**
6. Set:
   - **Margins**: `None`
   - **Scale**: `100%` (adjust between 97-103% if needed)
   - **Pages per sheet**: `1`
   - **Paper size**: `80mm Receipt` (your custom size)
7. Uncheck:
   - **Headers and footers**
   - **Background graphics** (unless needed)
8. Click **Save** to save these as default settings

### Firefox Configuration
1. Open Firefox browser
2. Navigate to your receipt page
3. Press **Ctrl+P** to open print dialog
4. Select **XP-80** as printer
5. Click **More Settings**
6. Set:
   - **Margins**: `0` (Custom margins)
   - **Scale**: `100%`
   - **Paper size**: Select your custom `80mm Receipt` size
7. Uncheck:
   - **Headers and footers**
8. Click **Save**

## Step 5: Test Print Configuration

### Print Test Page
1. Open your receipt page in browser
2. Press **Ctrl+P**
3. Verify settings:
   - Printer: XP-80
   - Margins: None
   - Scale: 100%
   - Paper size: 80mm Receipt
4. Click **Print**

### Check Results
1. **Width Check**: Content should reach both edges of 80mm paper
2. **Length Check**: All items should be visible without cutoff
3. **Readability**: Text should be crisp and clear

## Step 6: Fine-tuning (If Needed)

### Adjusting for Width Issues
If content doesn't reach edges:
1. Increase scale to 103-105%
2. Check printer's physical margin settings
3. Verify paper size in printer properties

If content gets cut off on edges:
1. Decrease scale to 95-97%
2. Add small padding (2-3mm) to receipt content
3. Check printer's physical margins

### Adjusting for Length Issues
If items are cut off:
1. Increase paper height in printer settings (try 250mm or 300mm)
2. Modify CSS padding values
3. Check for proper line-height settings

## Step 7: Command Line Configuration (Advanced)

### PowerShell Commands
Open PowerShell as Administrator and run:

```powershell
# Set printer configuration for full width printing
Set-PrintConfiguration -PrinterName "XP-80" -PaperSize "80mm Receipt" -MarginsType "Custom" -Margin 0

# Verify settings
Get-PrintConfiguration -PrinterName "XP-80"
```

### Print Test via Command Line
```powershell
# Print HTML file directly
$ie = New-Object -ComObject InternetExplorer.Application
$ie.Navigate("C:\path\to\your\receipt.html")
Start-Sleep -Seconds 5
$ie.ExecWB(6, 2)  # Print command
$ie.Quit()
```

## Step 8: Troubleshooting Common Issues

### Issue 1: Printer Not Found
**Solution**:
1. Check USB connection
2. Restart printer and computer
3. Reinstall printer driver
4. Try different USB port

### Issue 2: Content Too Narrow
**Solution**:
1. Set browser margins to "None"
2. Set printer margins to 0mm
3. Adjust scale to 103-105%

### Issue 3: Content Cut Off
**Solution**:
1. Set browser margins to "None"
2. Set printer margins to 0mm
3. Adjust scale to 95-97%
4. Increase paper height in settings

### Issue 4: Text Quality Poor
**Solution**:
1. Set Print Quality to "High" or "203 DPI"
2. Clean printer head
3. Check thermal paper quality
4. Ensure proper paper installation

## Step 9: Registry Settings (Advanced)

### Modify Printer Registry (Use with Caution)
1. Press **Win+R**, type `regedit`, press Enter
2. Navigate to:
   ```
   HKEY_CURRENT_USER\Printers\DevModePerUser
   ```
3. Find your XP-80 printer entry
4. Modify values:
   - `dmPaperWidth`: Set to 800 (80mm * 10)
   - `dmPaperLength`: Set to 2100 (210mm * 10)
   - `dmMargins`: Set all to 0

**Warning**: Backup registry before making changes!

## Step 10: Final Verification Checklist

Before finalizing setup:

1. ✅ Printer driver properly installed
2. ✅ Paper size set to Custom 80 x 210 mm
3. ✅ All margins set to 0mm
4. ✅ Browser print settings configured
5. ✅ Scale set to 100% (adjust as needed)
6. ✅ Test print shows full width usage
7. ✅ All receipt items visible
8. ✅ Text readable and crisp

## Additional Tips

### For Best Results:
1. Use high-quality thermal paper
2. Keep printer head clean
3. Store thermal paper in cool, dry place
4. Regularly update printer drivers
5. Keep one test receipt for quick verification

### For Multiple Users:
1. Export printer settings
2. Create setup script for other computers
3. Document exact configuration
4. Share browser print settings

With these Windows-specific configurations, your XP-80 thermal printer should properly print receipts that:
- Use the full 80mm width of the thermal paper
- Show all receipt items without cutting them off
- Have minimal margins on the sides
- Provide optimal readability