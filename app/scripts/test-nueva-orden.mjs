import { chromium } from 'playwright'

const BASE_URL = 'https://app-van-lacke.vercel.app'

;(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 300 })
  const page = await browser.newPage()
  page.setDefaultTimeout(60000)

  console.log('1. Abriendo login — iniciá sesión en el browser...')
  await page.goto(`${BASE_URL}/login`)
  await page.waitForURL(`${BASE_URL}/dashboard`, { timeout: 60000 })
  page.setDefaultTimeout(15000)
  await page.waitForLoadState('networkidle')
  await page.screenshot({ path: 'scripts/shot-01-dashboard.png' })
  console.log('   ✓ Dashboard cargado')

  console.log('2. Buscando botón Nueva Orden...')
  const btn = page.getByRole('button', { name: /nueva orden/i })
  await btn.waitFor({ state: 'visible' })
  console.log('   ✓ Botón encontrado')
  await btn.click()

  console.log('3. Verificando que el modal abre...')
  await page.waitForSelector('text=Nueva Orden de Producción')
  await page.screenshot({ path: 'scripts/shot-02-modal-abierto.png' })
  console.log('   ✓ Modal abierto')

  console.log('4. Seleccionando sistema "Skin"...')
  const selects = page.locator('select')
  await selects.first().selectOption({ label: 'Skin' })
  await page.waitForTimeout(500)

  console.log('5. Seleccionando producto...')
  const productoSelect = selects.nth(1)
  const opts = await productoSelect.locator('option').allTextContents()
  console.log('   Productos disponibles:', opts.join(', '))
  await productoSelect.selectOption({ index: 1 })
  await page.waitForTimeout(600)
  await page.screenshot({ path: 'scripts/shot-03-producto-seleccionado.png' })

  console.log('6. Verificando selector de máquina de corte...')
  const laserBtn  = page.getByRole('button', { name: 'Láser' })
  const punchBtn  = page.getByRole('button', { name: 'Punzonadora CNC' })
  const laserVis  = await laserBtn.isVisible()
  const punchVis  = await punchBtn.isVisible()
  console.log(`   Punzonadora CNC visible: ${punchVis} | Láser visible: ${laserVis}`)
  if (!laserVis) {
    console.error('   ✗ Selector de máquina NO apareció para producto TIPO A')
    await page.screenshot({ path: 'scripts/shot-ERROR.png' })
    await browser.close()
    process.exit(1)
  }
  console.log('   ✓ Selector de máquina correcto')

  console.log('7. Seleccionando Láser...')
  await laserBtn.click()
  await page.screenshot({ path: 'scripts/shot-04-laser-seleccionado.png' })

  console.log('8. Completando cantidad...')
  await page.fill('input[type=number]', '50')

  console.log('9. Activando toggle urgente...')
  await page.getByRole('switch').click()
  await page.screenshot({ path: 'scripts/shot-05-form-completo.png' })

  console.log('10. Enviando orden...')
  await page.getByRole('button', { name: 'Crear Orden' }).click()

  console.log('11. Esperando cierre del modal y refresh...')
  await page.waitForSelector('text=Nueva Orden de Producción', { state: 'detached', timeout: 12000 })
  await page.waitForLoadState('networkidle')
  await page.screenshot({ path: 'scripts/shot-06-dashboard-final.png' })
  console.log('   ✓ Modal cerrado — orden creada')

  console.log('\n✅ Todas las pruebas pasaron. Screenshots en scripts/shot-*.png')
  await browser.close()
})()
