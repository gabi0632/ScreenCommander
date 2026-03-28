Add-Type -AssemblyName System.Windows.Forms
[System.Windows.Forms.Screen]::AllScreens | ForEach-Object {
    [PSCustomObject]@{
        DeviceName = $_.DeviceName
        Primary = $_.Primary
        Width = $_.Bounds.Width
        Height = $_.Bounds.Height
        X = $_.Bounds.X
        Y = $_.Bounds.Y
    }
} | ConvertTo-Json
