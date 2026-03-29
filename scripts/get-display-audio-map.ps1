# Map each connected display to its corresponding HDMI/DP audio endpoint
# Uses multiple strategies:
#   1. GPU adapter topology: trace each monitor's parent GPU, then find the GPU's audio endpoint
#      by correlating PCI SUBSYS (byte-swapped) with HDAUDIO codec SUBSYS
#   2. EDID name fallback: match monitor name in audio endpoint label
# Returns JSON: [{ index, x, y, width, height, monitorName, audioDeviceLabel }]

Add-Type -AssemblyName System.Windows.Forms

# --- Step 1: EnumDisplayDevices type for screen-to-monitor correlation ---
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

# --- Step 2: Get EDID monitor names from WMI ---
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
} catch {}

# --- Step 3: Get active audio endpoints via COM API ---
# Uses MMDevice COM API to get the EXACT Chrome-compatible labels
# (including "2-" disambiguation for duplicate device names).
# Also reads the device description path to extract SUBSYS for GPU matching.

try {
    Add-Type -TypeDefinition @"
using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;

[StructLayout(LayoutKind.Sequential)]
public struct SC_MAP_PROPKEY {
    public Guid fmtid;
    public uint pid;
}

[StructLayout(LayoutKind.Explicit, Size = 24)]
public struct SC_MAP_PROPVAR {
    [FieldOffset(0)] public ushort vt;
    [FieldOffset(8)] public IntPtr pwszVal;
}

[ComImport, Guid("886D8EEB-8CF2-4446-8D02-CDBA1DBDCF99")]
[InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
public interface SC_MAP_IPS {
    int GetCount(out uint count);
    int GetAt(uint index, out SC_MAP_PROPKEY key);
    int GetValue(ref SC_MAP_PROPKEY key, out SC_MAP_PROPVAR value);
}

[ComImport, Guid("D666063F-1587-4E43-81F1-B948E807363F")]
[InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
public interface SC_MAP_IMMDev {
    int Activate(ref Guid iid, int clsCtx, IntPtr ap, out IntPtr iface);
    int OpenPropertyStore(int stgm, out SC_MAP_IPS properties);
    int GetId([MarshalAs(UnmanagedType.LPWStr)] out string id);
    int GetState(out int state);
}

[ComImport, Guid("0BD7A1BE-7A1A-44DB-8397-CC5392387B5E")]
[InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
public interface SC_MAP_IMMCol {
    int GetCount(out uint count);
    int Item(uint index, out SC_MAP_IMMDev device);
}

[ComImport, Guid("A95664D2-9614-4F35-A746-DE8DB63617E6")]
[InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
public interface SC_MAP_IMMEnum {
    int EnumAudioEndpoints(int flow, int mask, out SC_MAP_IMMCol devices);
    int GetDefaultAudioEndpoint(int flow, int role, out SC_MAP_IMMDev device);
}

[ComImport, Guid("BCDE0395-E52F-467C-8E3D-C4579291692E")]
public class SC_MAP_MMDevEnum {}

public static class SC_AudioMap {
    public static List<string[]> GetActiveRenderDevices() {
        var result = new List<string[]>();
        var enumerator = (SC_MAP_IMMEnum)new SC_MAP_MMDevEnum();
        SC_MAP_IMMCol devices;
        enumerator.EnumAudioEndpoints(0, 1, out devices);
        uint count;
        devices.GetCount(out count);

        var fnKey = new SC_MAP_PROPKEY {
            fmtid = new Guid("a45c254e-df1c-4efd-8020-67d146a850e0"), pid = 14
        };
        var ddKey = new SC_MAP_PROPKEY {
            fmtid = new Guid("b3f8fa53-0004-438e-9003-51a46e139bfc"), pid = 2
        };

        for (uint i = 0; i < count; i++) {
            SC_MAP_IMMDev device;
            devices.Item(i, out device);
            SC_MAP_IPS store;
            device.OpenPropertyStore(0, out store);

            string fn = "", dd = "";
            SC_MAP_PROPVAR pv;
            store.GetValue(ref fnKey, out pv);
            if (pv.vt == 31 && pv.pwszVal != IntPtr.Zero) fn = Marshal.PtrToStringUni(pv.pwszVal);
            store.GetValue(ref ddKey, out pv);
            if (pv.vt == 31 && pv.pwszVal != IntPtr.Zero) dd = Marshal.PtrToStringUni(pv.pwszVal);
            result.Add(new string[] { fn, dd });
        }
        return result;
    }
}
"@ -ErrorAction SilentlyContinue
} catch {}

$audioEndpoints = @() # { Label, Subsys }
try {
    $comDevices = [SC_AudioMap]::GetActiveRenderDevices()
    foreach ($d in $comDevices) {
        $label = $d[0]
        $subsys = ''
        if ($d[1] -match 'SUBSYS_([0-9A-Fa-f]{8})') {
            $subsys = $Matches[1].ToUpper()
        }
        $audioEndpoints += [PSCustomObject]@{ Label = $label; Subsys = $subsys }
    }
} catch {
    # Fallback: registry-based (without "2-" disambiguation)
    $audioBasePath = 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\MMDevices\Audio\Render'
    Get-ChildItem $audioBasePath -ErrorAction SilentlyContinue | ForEach-Object {
        $devicePath = $_.PSPath
        $stateValue = (Get-ItemProperty $devicePath -ErrorAction SilentlyContinue).DeviceState
        if ($stateValue -eq 1) {
            $propsPath = Join-Path $devicePath 'Properties'
            $props = Get-ItemProperty $propsPath -ErrorAction SilentlyContinue
            if ($props) {
                $endpointName = $props.'{a45c254e-df1c-4efd-8020-67d146a850e0},2'
                $driverName = $props.'{b3f8fa53-0004-438e-9003-51a46e139bfc},6'
                $deviceDesc = $props.'{b3f8fa53-0004-438e-9003-51a46e139bfc},2'
                if ($endpointName -and $driverName) {
                    $label = "$endpointName ($driverName)"
                    $subsys = ''
                    if ($deviceDesc -match 'SUBSYS_([0-9A-Fa-f]{8})') {
                        $subsys = $Matches[1].ToUpper()
                    }
                    $audioEndpoints += [PSCustomObject]@{ Label = $label; Subsys = $subsys }
                }
            }
        }
    }
}

# Build GPU PCI DeviceID -> audio label mapping via SUBSYS byte-swap
$gpuPnpToAudio = @{} # gpuPnpDeviceId -> audioLabel
try {
    $gpus = Get-CimInstance Win32_VideoController -ErrorAction Stop
    foreach ($gpu in $gpus) {
        if ($gpu.PNPDeviceID -match 'SUBSYS_([0-9A-Fa-f]{8})') {
            $pciSubsys = $Matches[1].ToUpper()
            # Byte-swap: "1140103C" -> "103C1140"
            if ($pciSubsys.Length -eq 8) {
                $swapped = $pciSubsys.Substring(4, 4) + $pciSubsys.Substring(0, 4)
                foreach ($ep in $audioEndpoints) {
                    if ($ep.Subsys -eq $swapped) {
                        $gpuPnpToAudio[$gpu.PNPDeviceID] = $ep.Label
                        break
                    }
                }
            }
        }
    }
} catch {}

# --- Step 4: Map PnP monitors to their parent GPU ---
# Group by hardware ID for correlation with EnumDisplayDevices
$pnpMonitorsByHwId = @{} # hwId -> sorted list of { InstanceId, GpuPnpId }
try {
    $pnpMonitors = Get-PnpDevice -Class Monitor -Status OK -ErrorAction Stop
    foreach ($m in $pnpMonitors) {
        $parts = $m.InstanceId -split '\\'
        if ($parts.Length -lt 2) { continue }
        $hwId = $parts[1]

        $parentProp = Get-PnpDeviceProperty -InstanceId $m.InstanceId -KeyName 'DEVPKEY_Device_Parent' -ErrorAction SilentlyContinue
        $gpuPnpId = if ($parentProp) { $parentProp.Data } else { '' }

        if (-not $pnpMonitorsByHwId.ContainsKey($hwId)) {
            $pnpMonitorsByHwId[$hwId] = @()
        }
        $pnpMonitorsByHwId[$hwId] += [PSCustomObject]@{
            InstanceId = $m.InstanceId
            GpuPnpId   = $gpuPnpId
        }
    }
    # Sort each group for consistent ordering
    foreach ($hwId in @($pnpMonitorsByHwId.Keys)) {
        $pnpMonitorsByHwId[$hwId] = @($pnpMonitorsByHwId[$hwId] | Sort-Object InstanceId)
    }
} catch {}

# --- Step 5: Build the final mapping for each screen ---
# Simple approach: match each display's EDID monitor name to an audio endpoint
# whose label starts with that name. Each HDMI/DP port's audio endpoint is
# named after the connected monitor by the GPU driver.
$screens = [System.Windows.Forms.Screen]::AllScreens
$result = @()
$index = 0
$usedAudioLabels = @{}

foreach ($screen in $screens) {
    $devName = $screen.DeviceName
    $monName = ''
    $audioLabel = ''

    # Get monitor EDID name via EnumDisplayDevices
    $monitor = New-Object SC_DISPLAY_DEVICE
    $monitor.cb = [Runtime.InteropServices.Marshal]::SizeOf($monitor)
    if ([SC_DisplayHelper]::EnumDisplayDevices($devName, 0, [ref]$monitor, 0)) {
        if ($monitor.DeviceID) {
            $monParts = $monitor.DeviceID -split '\\'
            if ($monParts.Length -ge 2 -and $edidMap.ContainsKey($monParts[1])) {
                $monName = $edidMap[$monParts[1]]
            }
        }
        if (-not $monName -and $monitor.DeviceString) {
            $monName = $monitor.DeviceString
        }
    }

    # Match: find audio endpoint whose label starts with the monitor name.
    # Each HDMI/DP port's audio endpoint is named after its connected monitor
    # by the GPU driver (e.g., "SyncMaster (NVIDIA...)" for a Samsung monitor).
    if ($monName -and $monName -ne 'Generic PnP Monitor') {
        foreach ($ep in $audioEndpoints) {
            if ($ep.Label -like "$monName *" -and -not $usedAudioLabels.ContainsKey($ep.Label)) {
                $audioLabel = $ep.Label
                break
            }
        }
        # Allow reuse for same monitor model on different ports
        if (-not $audioLabel) {
            foreach ($ep in $audioEndpoints) {
                if ($ep.Label -like "$monName *") {
                    $audioLabel = $ep.Label
                    break
                }
            }
        }
    }
    # Displays without EDID match (Generic PnP) get empty label.
    # Users should set audioDeviceId manually via the control panel for these.

    if ($audioLabel) { $usedAudioLabels[$audioLabel] = $true }

    # Index for same-label disambiguation
    $audioDeviceIdx = 0
    foreach ($prev in $result) {
        if ($prev.audioDeviceLabel -eq $audioLabel) { $audioDeviceIdx++ }
    }

    $result += [PSCustomObject]@{
        index            = $index
        deviceName       = $devName
        x                = $screen.Bounds.X
        y                = $screen.Bounds.Y
        width            = $screen.Bounds.Width
        height           = $screen.Bounds.Height
        primary          = [bool]$screen.Primary
        monitorName      = $monName
        audioDeviceLabel = $audioLabel
        audioDeviceIndex = $audioDeviceIdx
    }
    $index++
}

$result | ConvertTo-Json -Depth 3 -Compress
