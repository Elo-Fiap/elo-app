// Gera o ícone e a abertura a partir da marca (mesma geometria de src/components/Logo.tsx).
// Rodar na raiz do app:  swift ferramentas/gerar-marca.swift
import AppKit

struct Cor { let r, g, b: CGFloat
  init(_ hex: Int) { r = CGFloat((hex >> 16) & 255) / 255; g = CGFloat((hex >> 8) & 255) / 255; b = CGFloat(hex & 255) / 255 }
  var cg: CGColor { CGColor(srgbRed: r, green: g, blue: b, alpha: 1) }
}

/// `larguraDaMarca`: largura das argolas em pixels. A marca ocupa 36 x 22 na grade original.
func gerar(_ nome: String, lado: Int = 1024, fundo: Cor?, primeira: Cor?, segunda: Cor?, larguraDaMarca: CGFloat = 0) {
  let espaco = CGColorSpace(name: CGColorSpace.sRGB)!
  let ctx = CGContext(data: nil, width: lado, height: lado, bitsPerComponent: 8, bytesPerRow: 0, space: espaco,
                      // Ícone com fundo sai sem canal alfa: a App Store recusa ícone com transparência.
                      bitmapInfo: (fundo == nil ? CGImageAlphaInfo.premultipliedLast : CGImageAlphaInfo.noneSkipLast).rawValue)!
  ctx.setAllowsAntialiasing(true)
  ctx.setShouldAntialias(true)
  if let fundo { ctx.setFillColor(fundo.cg); ctx.fill(CGRect(x: 0, y: 0, width: lado, height: lado)) }
  if let primeira, let segunda {
    let e = larguraDaMarca / 36
    let ox = (CGFloat(lado) - 36 * e) / 2
    let oy = (CGFloat(lado) - 22 * e) / 2
    // x e y da grade original (viewBox 1 8 36 22); o CoreGraphics conta y de baixo para cima, mas a marca é simétrica na vertical.
    func elo(_ x: CGFloat, _ cor: Cor) {
      let r = CGRect(x: ox + (x - 1) * e, y: oy + (10 - 8) * e, width: 21 * e, height: 18 * e)
      ctx.setStrokeColor(cor.cg)
      ctx.setLineWidth(4 * e)
      ctx.addPath(CGPath(roundedRect: r, cornerWidth: 9 * e, cornerHeight: 9 * e, transform: nil))
      ctx.strokePath()
    }
    elo(3, primeira)
    elo(14, segunda)
  }
  let rep = NSBitmapImageRep(cgImage: ctx.makeImage()!)
  try! rep.representation(using: .png, properties: [:])!.write(to: URL(fileURLWithPath: "assets/images/\(nome).png"))
  print(nome)
}

let fundoEscuro = Cor(0x0E0E0E), tintaEscuro = Cor(0xF8F8F8), silencioEscuro = Cor(0xFFE657)
let tintaClaro = Cor(0x141414), silencioClaro = Cor(0x7A5200)
let branco = Cor(0xFFFFFF)

gerar("icon", fundo: fundoEscuro, primeira: tintaEscuro, segunda: silencioEscuro, larguraDaMarca: 640)
gerar("android-icon-foreground", fundo: nil, primeira: tintaEscuro, segunda: silencioEscuro, larguraDaMarca: 500)
gerar("android-icon-background", fundo: fundoEscuro, primeira: nil, segunda: nil)
gerar("android-icon-monochrome", fundo: nil, primeira: branco, segunda: branco, larguraDaMarca: 500)
gerar("splash-icon", fundo: nil, primeira: tintaEscuro, segunda: silencioEscuro, larguraDaMarca: 900)
gerar("splash-icon-claro", fundo: nil, primeira: tintaClaro, segunda: silencioClaro, larguraDaMarca: 900)
