# List only ACTIVE audio render (output) devices
# Device state 1 = Active, stored in registry key DeviceState

$basePath = 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\MMDevices\Audio\Render'
$devices = @()

Get-ChildItem $basePath -ErrorAction SilentlyContinue | ForEach-Object {
    $devicePath = $_.PSPath
    $stateValue = (Get-ItemProperty $devicePath -ErrorAction SilentlyContinue).DeviceState

    # Only include active devices (state = 1)
    if ($stateValue -eq 1) {
        $propsPath = Join-Path $devicePath 'Properties'
        $props = Get-ItemProperty $propsPath -ErrorAction SilentlyContinue

        if ($props) {
            $interfaceName = $props.'{b3f8fa53-0004-438e-9003-51a46e139bfc},6'
            $description = $props.'{a45c254e-df1c-4efd-8020-67d146a850e0},2'

            if ($description) {
                $fullName = "$description ($interfaceName)"
                $devices += [PSCustomObject]@{
                    Name = $fullName
                    DeviceId = $fullName
                }
            }
        }
    }
}

$unique = $devices | Sort-Object Name -Unique
$unique | ConvertTo-Json -Depth 3
