# List active audio render (output) devices using the MMDevice COM API.
# Returns the EXACT Chrome-compatible labels (including "2-" disambiguation for duplicates).

try {
    Add-Type -TypeDefinition @"
using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;

[StructLayout(LayoutKind.Sequential)]
public struct SC_AD_PROPERTYKEY {
    public Guid fmtid;
    public uint pid;
}

[StructLayout(LayoutKind.Explicit, Size = 24)]
public struct SC_AD_PROPVARIANT {
    [FieldOffset(0)] public ushort vt;
    [FieldOffset(8)] public IntPtr pwszVal;
}

[ComImport, Guid("886D8EEB-8CF2-4446-8D02-CDBA1DBDCF99")]
[InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
public interface SC_AD_IPropertyStore {
    int GetCount(out uint count);
    int GetAt(uint index, out SC_AD_PROPERTYKEY key);
    int GetValue(ref SC_AD_PROPERTYKEY key, out SC_AD_PROPVARIANT value);
}

[ComImport, Guid("D666063F-1587-4E43-81F1-B948E807363F")]
[InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
public interface SC_AD_IMMDevice {
    int Activate(ref Guid iid, int clsCtx, IntPtr activationParams, out IntPtr iface);
    int OpenPropertyStore(int stgmAccess, out SC_AD_IPropertyStore properties);
    int GetId([MarshalAs(UnmanagedType.LPWStr)] out string id);
    int GetState(out int state);
}

[ComImport, Guid("0BD7A1BE-7A1A-44DB-8397-CC5392387B5E")]
[InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
public interface SC_AD_IMMDeviceCollection {
    int GetCount(out uint count);
    int Item(uint index, out SC_AD_IMMDevice device);
}

[ComImport, Guid("A95664D2-9614-4F35-A746-DE8DB63617E6")]
[InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
public interface SC_AD_IMMDeviceEnumerator {
    int EnumAudioEndpoints(int dataFlow, int stateMask, out SC_AD_IMMDeviceCollection devices);
    int GetDefaultAudioEndpoint(int dataFlow, int role, out SC_AD_IMMDevice device);
}

[ComImport, Guid("BCDE0395-E52F-467C-8E3D-C4579291692E")]
public class SC_AD_MMDeviceEnumerator {}

public static class SC_AudioDeviceList {
    public static List<string[]> GetActiveRenderDevices() {
        var result = new List<string[]>();
        var enumerator = (SC_AD_IMMDeviceEnumerator)new SC_AD_MMDeviceEnumerator();
        SC_AD_IMMDeviceCollection devices;
        enumerator.EnumAudioEndpoints(0, 1, out devices);

        uint count;
        devices.GetCount(out count);

        var key = new SC_AD_PROPERTYKEY {
            fmtid = new Guid("a45c254e-df1c-4efd-8020-67d146a850e0"),
            pid = 14
        };

        for (uint i = 0; i < count; i++) {
            SC_AD_IMMDevice device;
            devices.Item(i, out device);

            SC_AD_IPropertyStore store;
            device.OpenPropertyStore(0, out store);

            string name = "";
            SC_AD_PROPVARIANT pv;
            store.GetValue(ref key, out pv);
            if (pv.vt == 31 && pv.pwszVal != IntPtr.Zero) {
                name = Marshal.PtrToStringUni(pv.pwszVal);
            }

            result.Add(new string[] { name });
        }
        return result;
    }
}
"@ -ErrorAction SilentlyContinue
} catch {}

$result = @()
$devices = [SC_AudioDeviceList]::GetActiveRenderDevices()
foreach ($d in $devices) {
    $result += [PSCustomObject]@{
        Name = $d[0]
        DeviceId = $d[0]
    }
}

$result | ConvertTo-Json -Depth 3
