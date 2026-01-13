export async function pdfToImage(file: File): Promise<File> {
  try {
    console.log('Starting PDF conversion for:', file.name);
    
    // Dynamically import pdfjs-dist only on the client side
    const pdfjsLib = await import('pdfjs-dist');
    
    // Set worker source - using unpkg CDN with the installed version
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@5.4.530/build/pdf.worker.min.mjs`;
    
    // Read the PDF file
    const arrayBuffer = await file.arrayBuffer();
    console.log('PDF file read successfully, size:', arrayBuffer.byteLength);
    
    // Load the PDF document
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    console.log('PDF loaded, pages:', pdf.numPages);
    
    // Get the first page
    const page = await pdf.getPage(1);
    console.log('Page 1 loaded');
    
    // Set up canvas for rendering
    const scale = 2.0; // Higher scale for better quality
    const viewport = page.getViewport({ scale });
    console.log('Viewport:', viewport.width, 'x', viewport.height);
    
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    if (!context) {
      throw new Error('Could not get canvas context');
    }
    
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    
    // Render the page to canvas
    console.log('Starting page render...');
    await page.render({
      canvasContext: context,
      viewport: viewport
    }).promise;
    console.log('Page rendered successfully');
    
    // Convert canvas to blob
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) {
          console.log('Blob created, size:', blob.size);
          resolve(blob);
        } else {
          reject(new Error('Failed to convert canvas to blob'));
        }
      }, 'image/png');
    });
    
    // Create a File object from the blob
    const imageFile = new File([blob], file.name.replace('.pdf', '.png'), {
      type: 'image/png',
      lastModified: Date.now()
    });
    
    console.log('PDF converted to image successfully');
    return imageFile;
  } catch (error) {
    console.error('Error converting PDF to image:', error);
    // Re-throw with more context
    if (error instanceof Error) {
      throw new Error(`PDF conversion failed: ${error.message}`);
    }
    throw new Error('Failed to convert PDF to image');
  }
}

