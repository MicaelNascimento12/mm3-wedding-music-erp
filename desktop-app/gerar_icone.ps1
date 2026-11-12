# Gera o icone (.ico 256x256) do aplicativo Gestao de Casamentos
param([string]$Destino = (Join-Path $PSScriptRoot 'icone-casamentos.ico'))

Add-Type -AssemblyName System.Drawing

$size = 256
$bmp = New-Object System.Drawing.Bitmap $size, $size
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
$g.Clear([System.Drawing.Color]::Transparent)

# Fundo arredondado escuro (slate-900)
$radius = 56
$path = New-Object System.Drawing.Drawing2D.GraphicsPath
$path.AddArc(0, 0, $radius, $radius, 180, 90)
$path.AddArc($size - $radius, 0, $radius, $radius, 270, 90)
$path.AddArc($size - $radius, $size - $radius, $radius, $radius, 0, 90)
$path.AddArc(0, $size - $radius, $radius, $radius, 90, 90)
$path.CloseFigure()
$bg = New-Object System.Drawing.Drawing2D.LinearGradientBrush (New-Object System.Drawing.Point 0, 0), (New-Object System.Drawing.Point $size, $size), ([System.Drawing.Color]::FromArgb(255, 15, 23, 42)), ([System.Drawing.Color]::FromArgb(255, 30, 41, 59))
$g.FillPath($bg, $path)

# Nota musical dourada (amber)
$gold = New-Object System.Drawing.Drawing2D.LinearGradientBrush (New-Object System.Drawing.Point 0, 0), (New-Object System.Drawing.Point $size, $size), ([System.Drawing.Color]::FromArgb(255, 251, 191, 36)), ([System.Drawing.Color]::FromArgb(255, 217, 119, 6))
$font = New-Object System.Drawing.Font 'Segoe UI Symbol', 150, ([System.Drawing.FontStyle]::Bold), ([System.Drawing.GraphicsUnit]::Pixel)
$fmt = New-Object System.Drawing.StringFormat
$fmt.Alignment = [System.Drawing.StringAlignment]::Center
$fmt.LineAlignment = [System.Drawing.StringAlignment]::Center
$g.DrawString([string][char]0x266B, $font, $gold, (New-Object System.Drawing.RectangleF 0, 4, $size, $size), $fmt)
$g.Dispose()

# Salva PNG em memoria e embute dentro de um .ico (formato suportado pelo Windows Vista+)
$ms = New-Object System.IO.MemoryStream
$bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
$png = $ms.ToArray()
$bmp.Dispose()

$fs = [System.IO.File]::Create($Destino)
$bw = New-Object System.IO.BinaryWriter $fs
$bw.Write([UInt16]0); $bw.Write([UInt16]1); $bw.Write([UInt16]1)   # header
$bw.Write([Byte]0); $bw.Write([Byte]0); $bw.Write([Byte]0); $bw.Write([Byte]0) # 256x256
$bw.Write([UInt16]1); $bw.Write([UInt16]32)                         # planes, bpp
$bw.Write([UInt32]$png.Length); $bw.Write([UInt32]22)               # size, offset
$bw.Write($png)
$bw.Close()
Write-Output "Icone gerado em: $Destino"
