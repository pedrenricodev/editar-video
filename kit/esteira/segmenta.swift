// Recorta a PESSOA de cada quadro (Vision, nativo do macOS) e grava PNG com alfa.
// Uso: swift segmenta.swift <pasta_quadros_jpg> <pasta_saida_png>
// Quadros de entrada, do trecho em que o texto passa atras da pessoa:
//   ffmpeg -ss 0 -t 2.4 -i take.mp4 -q:v 2 quadros/%04d.jpg
// Saida em public/<pasta>/0001.png...; aponte o `recorte` do elemento pra ela.
// So macOS (framework Vision).
import Foundation
import Vision
import CoreImage
import AppKit

let args = CommandLine.arguments
let entrada = URL(fileURLWithPath: args[1]), saida = URL(fileURLWithPath: args[2])
try? FileManager.default.createDirectory(at: saida, withIntermediateDirectories: true)
let ctx = CIContext()
let arqs = try FileManager.default.contentsOfDirectory(atPath: entrada.path).filter { $0.hasSuffix(".jpg") }.sorted()
let req = VNGeneratePersonSegmentationRequest()
req.qualityLevel = .accurate
req.outputPixelFormat = kCVPixelFormatType_OneComponent8
for nome in arqs {
    let url = entrada.appendingPathComponent(nome)
    guard let img = CIImage(contentsOf: url) else { continue }
    let h = VNImageRequestHandler(ciImage: img, options: [:])
    try h.perform([req])
    guard let buf = req.results?.first?.pixelBuffer else { continue }
    var mask = CIImage(cvPixelBuffer: buf)
    mask = mask.transformed(by: CGAffineTransform(scaleX: img.extent.width / mask.extent.width, y: img.extent.height / mask.extent.height))
    let semFundo = CIImage(color: .clear).cropped(to: img.extent)
    let out = img.applyingFilter("CIBlendWithMask", parameters: [kCIInputBackgroundImageKey: semFundo, kCIInputMaskImageKey: mask])
    let dest = saida.appendingPathComponent(nome.replacingOccurrences(of: ".jpg", with: ".png"))
    try ctx.writePNGRepresentation(of: out, to: dest, format: .RGBA8, colorSpace: CGColorSpace(name: CGColorSpace.sRGB)!)
}
print("ok", arqs.count)
