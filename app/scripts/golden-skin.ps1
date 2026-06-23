
# golden-skin.ps1 — Captura golden metal (no-override) via Excel COM
# Workbook: Cotizador VELUM - Validacion Modelo v7.xlsx
# Rama: metal (familia.precioM2 = 0), diseño Standard, Alum 1,5mm

$wbPath = "C:\Users\Nissei\_tmp_costeo\planilla\Cotizador VELUM - Validacion Modelo v7.xlsx"
$outPath = "C:\Users\Nissei\Velum\app\src\lib\cotizador\skin\__fixtures__\golden-metal.json"

$xl = $null
$wb = $null

try {
    $xl = New-Object -ComObject Excel.Application
    $xl.Visible = $false
    $xl.DisplayAlerts = $false
    $xl.AskToUpdateLinks = $false

    $wb = $xl.Workbooks.Open($wbPath, 0, $false)
    $s = $wb.Sheets.Item("Simulador")

    # Set metal case: Standard design + Alum 1,5mm
    # Leave B5=30, B6=25, B7=Skin, B12=B13=1, B34 alcance, B36=0 as they are
    $s.Range("B8").Value2 = "Standard"
    $s.Range("B10").Value2 = "Alum 1,5mm"

    # Force full recalculation
    $xl.CalculateFullRebuild()

    # Read result cells (E18..E28) and also resolved inputs (B9, B11, B15)
    $material    = $s.Range("E18").Value2
    $fab         = $s.Range("E19").Value2
    $pintura     = $s.Range("E21").Value2
    $tornilleria = $s.Range("E22").Value2
    $total       = $s.Range("E23").Value2
    $costoM2     = $s.Range("E24").Value2
    $precio      = $s.Range("E27").Value2
    $precioM2    = $s.Range("E28").Value2
    $paneles     = $s.Range("E8").Value2
    $mensulas    = $s.Range("E13").Value2
    $kp          = $s.Range("B9").Value2
    $espesorMm   = $s.Range("B11").Value2
    $familia     = $s.Range("B15").Value2

    $out = [ordered]@{
        material    = $material
        fab         = $fab
        pintura     = $pintura
        tornilleria = $tornilleria
        total       = $total
        costoM2     = $costoM2
        precio      = $precio
        precioM2    = $precioM2
        paneles     = $paneles
        mensulas    = $mensulas
        kp          = $kp
        espesorMm   = $espesorMm
        familia     = $familia
    }

    $json = ($out | ConvertTo-Json) + "`n"
    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($outPath, $json, $utf8NoBom)

    Write-Host "=== golden-metal.json written ==="
    Write-Host $json
    Write-Host ""
    Write-Host "Sanity check:"
    Write-Host "  material  = $material  (must be > 0)"
    Write-Host "  pintura   = $pintura   (must be > 0, metal is painted)"
    Write-Host "  total     = $total     (must be > 0)"
    Write-Host "  precioM2  = $precioM2"
    Write-Host "  familia   = $familia"
    Write-Host "  kp        = $kp"
    Write-Host "  espesorMm = $espesorMm"

} finally {
    if ($wb -ne $null) {
        $wb.Close($false)
    }
    if ($xl -ne $null) {
        $xl.Quit()
        [System.Runtime.Interopservices.Marshal]::ReleaseComObject($xl) | Out-Null
    }
    [System.GC]::Collect()
    [System.GC]::WaitForPendingFinalizers()
}
