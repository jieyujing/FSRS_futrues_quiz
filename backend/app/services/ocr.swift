import Foundation
import PDFKit
import Vision
import AppKit

// Arguments check
guard CommandLine.arguments.count > 1 else {
    print("Usage: swift ocr.swift <pdf-file-path>")
    exit(1)
}

let pdfPath = CommandLine.arguments[1]
let pdfURL = URL(fileURLWithPath: pdfPath)

guard let pdfDocument = PDFDocument(url: pdfURL) else {
    print("Error: Cannot open PDF document at \(pdfPath)")
    exit(1)
}

let pageCount = pdfDocument.pageCount
var extractedText = ""

for i in 0..<pageCount {
    guard let page = pdfDocument.page(at: i) else { continue }
    
    let pageBounds = page.bounds(for: .mediaBox)
    let dpi: CGFloat = 150.0
    let scale = dpi / 72.0
    let width = pageBounds.width * scale
    let height = pageBounds.height * scale
    let size = NSSize(width: width, height: height)
    
    let image = NSImage(size: size, flipped: false) { rect in
        guard let context = NSGraphicsContext.current?.cgContext else { return false }
        context.setFillColor(NSColor.white.cgColor)
        context.fill(rect)
        context.scaleBy(x: scale, y: scale)
        page.draw(with: .mediaBox, to: context)
        return true
    }
    
    guard let cgImage = image.cgImage(forProposedRect: nil, context: nil, hints: nil) else {
        continue
    }
    
    let requestHandler = VNImageRequestHandler(cgImage: cgImage, options: [:])
    
    var pageText = ""
    let request = VNRecognizeTextRequest { request, error in
        guard let observations = request.results as? [VNRecognizedTextObservation], error == nil else {
            return
        }
        
        pageText = observations.compactMap { observation in
            observation.topCandidates(1).first?.string
        }.joined(separator: "\n")
    }
    
    request.recognitionLevel = .accurate
    request.recognitionLanguages = ["zh-Hans", "en-US"]
    
    do {
        try requestHandler.perform([request])
        extractedText += "--- Page \(i + 1) ---\n"
        extractedText += pageText + "\n"
    } catch {
        print("Vision request failed on page \(i + 1): \(error)", to: &stderrStream)
    }
}

// Write to standard output
print(extractedText)

// Helper stream to print to stderr
struct StderrOutputStream: TextOutputStream {
    func write(_ string: String) {
        fputs(string, stderr)
    }
}
var stderrStream = StderrOutputStream()
