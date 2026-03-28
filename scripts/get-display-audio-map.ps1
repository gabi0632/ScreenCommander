# Map each connected display to its corresponding HDMI/DP audio endpoint
# Uses EDID monitor names (from WMI) to match displays to audio outputs
# Returns JSON: [{ index, x, y, width, height, monitorName, audioDeviceLabel }]

Add-Type -AssemblyName System.Windows.Forms

# --- Step 1: Get EDID monitor names from WMI ---
$edidMap = @{} # hardwareId -> monitorName
try {
    $wmiMonitors = Get-CimInstance -Namespace root\wmi -ClassName WmiMonitorID -ErrorAction Stop
    foreach ($m in $wmiMonitors) {
        $nameChars = $m.UserFriendlyName | Where-Object { $_ -ne 0 }
        $name = if ($nameChars) { ($nameChars | ForEach-Object { [char]$_ }) -join '' } else { '' }
        if ($name) {
            $parts = $m.InstanceName -split '\\'
            if ($parts.Length -ge 2) {
                $edidMap[$parts[1]] = $name.Trim()
            }
        }
    }
} catch {
    # WMI unavailable — continue without EDID names
}

# --- Step 2: Map screen device names to monitor EDID names via EnumDisplayDevices ---
try {
    Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;

[StructLayout(LayoutKind.Sequential, CharSet = CharSet.Auto)]
public struct SC_DISPLAY_DEVICE {
    public int cb;
    [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 32)]
    public string DeviceName;
    [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 128)]
    public string DeviceString;
    public int StateFlags;
    [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 128)]
    public string DeviceID;
    [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 128)]
    public string DeviceKey;
}

public static class SC_DisplayHelper {
    [DllImport("user32.dll", CharSet = CharSet.Auto)]
    public static extern bool EnumDisplayDevices(
        string lpDevice, uint iDevNum,
        ref SC_DISPLAY_DEVICE lpDisplayDevice, uint dwFlags);
}
"@ -ErrorAction SilentlyContinue
} catch {
    # Type may already be loaded in this session
}

$screenMonitorNames = @{} # \\.\DISPLAY1 -> "LG TV"
$screens = [System.Windows.Forms.Screen]::AllScreens
foreach ($screen in $screens) {
    $devName = $screen.DeviceName
    $monitor = New-Object SC_DISPLAY_DEVICE
    $monitor.cb = [Runtime.InteropServices.Marshal]::SizeOf($monitor)
    if ([SC_DisplayHelper]::EnumDisplayDevices($devName, 0, [ref]$monitor, 0)) {
        if ($monitor.DeviceID) {
            $monParts = $monitor.DeviceID -split '\\'
            if ($monParts.Length -ge 2 -and $edidMap.ContainsKey($monParts[1])) {
                $screenMonitorNames[$devName] = $edidMap[$monParts[1]]
            }
        }
        # Fallback: use driver-reported name (e.g. "Generic PnP Monitor")
        if (-not $screenMonitorNames.ContainsKey($devName) -and $monitor.DeviceString) {
            $screenMonitorNames[$devName] = $monitor.DeviceString
        }
    }
}

# --- Step 3: Get audio render endpoints with Chrome-format labels ---
# Chrome constructs labels as: "$endpointName ($driverName)" using properties 2 and 6
$audioBasePath = 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\MMDevices\Audio\Render'
$audioEndpoints = @() # array of Chrome-format labels
Get-ChildItem $audioBasePath -ErrorAction SilentlyContinue | ForEach-Object {
    $devicePath = $_.PSPath
    $stateValue = (Get-ItemProperty $devicePath -ErrorAction SilentlyContinue).DeviceState
    if ($stateValue -eq 1) {
        $propsPath = Join-Path $devicePath 'Properties'
        $props = Get-ItemProperty $propsPath -ErrorAction SilentlyContinue
        if ($props) {
            $endpointName = $props.'{a45c254e-df1c-4efd-8020-67d146a850e0},2'
            $driverName = $props.'{b3f8fa53-0004-438e-9003-51a46e139bfc},6'
            if ($endpointName -and $driverName) {
                $audioEndpoints += "$endpointName ($driverName)"
            }
        }
    }
}

# --- Step 4: Build mapping — match each screen to an audio endpoint by monitor name ---
$result = @()
$index = 0
foreach ($screen in $screens) {
    $devName = $screen.DeviceName
    $monName = if ($screenMonitorNames.ContainsKey($devName)) { $screenMonitorNames[$devName] } else { '' }
    $audioLabel = ''

    if ($monName -and $monName -ne 'Generic PnP Monitor') {
        foreach ($ep in $audioEndpoints) {
            if ($ep -like "*$monName*") {
                $audioLabel = $ep
                break
            }
        }
    }

    $result += [PSCustomObject]@{
        index         = $index
        deviceName    = $devName
        x             = $screen.Bounds.X
        y             = $screen.Bounds.Y
        width         = $screen.Bounds.Width
        height        = $screen.Bounds.Height
        primary       = [bool]$screen.Primary
        monitorName   = $monName
        audioDeviceLabel = $audioLabel
    }
    $index++
}

$result | ConvertTo-Json -Depth 3 -Compress
