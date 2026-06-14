import * as bwipjs from 'bwip-js'
import QRCode from 'qrcode'

export async function barcodeBase64(text: string): Promise<string> {
  const buffer = await (bwipjs as any).toBuffer({
    bcid: 'code128',
    text,
    scale: 2,
    height: 8,
    includetext: false,
  })
  return `data:image/png;base64,${buffer.toString('base64')}`
}

export async function qrBase64(url: string): Promise<string> {
  return QRCode.toDataURL(url, { width: 80, margin: 1 })
}
