import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabaseClient';
import { ArrowLeft, Download } from 'lucide-react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card"; // Import Card components
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, // Might need provider at top level if not already there, but App.tsx has one
  TooltipTrigger 
} from "@/components/ui/tooltip"; // Import Tooltip components
import { useAuth } from '@/contexts/AuthContext'; // Import useAuth

// Define type for the fetched analysis data (can be refined later)
// Should match the Row type from database.types.ts ideally
type AnalysisDetails = {
    id: string;
    analysis_date: string | null;
    raw_analysis: any; // Or a more specific JSON type if known
    temp_drawing_path: string | null;
    // Add related fields if fetched via join
    client_name?: string;
    drawing_type_name?: string;
};

// Define a type for the parsed analysis JSON structure (based on observed fields)
interface ParsedAnalysis {
  summary?: string;
  drawing_type?: string; // Note: This might be redundant with drawing_type_name
  ai_disclaimer?: string;
  emotional_tone?: string;
  key_observations?: string[];
  relational_aspects?: string;
  potential_conflicts?: string[];
  potential_strengths?: string[];
  interpretive_indicators?: string[];
  developmental_considerations?: string;
}

// --- PDF Template Constants --- 

const pdfStyles = `
/* Reset and Base Styles */
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; background-color: #fff; padding: 0; margin: 0; font-size: 10pt; } /* Slightly smaller base font size */
/* Page Layout (Conceptual, applied to capture div) */
.page { width: 210mm; /* A4 width for reference */ padding: 15mm; /* Good padding */ background: white; }
/* Typography */
h1 { font-size: 20pt; color: #222; text-align: center; margin-bottom: 25px; /* More space after title */ font-weight: 600; }
h2 { font-size: 14pt; color: #444; margin: 20px 0 10px 0; /* Increased top margin */ padding-bottom: 4px; border-bottom: 1px solid #e0e0e0; font-weight: 600;}
h3 { font-size: 12pt; color: #333; margin: 15px 0 10px 0; font-weight: 600;} /* Spacing for potential future use */
p { margin-bottom: 10px; text-align: justify; } /* Justify text */
ul { margin-bottom: 12px; list-style-position: outside; padding-left: 1.5em; } /* Ensure bullet is outside, add padding */
li { margin-bottom: 5px; padding-left: 0.5em; } /* Add padding for text alignment */
/* Header Section */
.report-header { margin-bottom: 20px; }
.client-info { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 25px; /* Adjusted gap */ margin-top: 20px; margin-bottom: 25px; /* Space below info */ font-size: 10pt; }
.info-group { margin-bottom: 5px; }
.info-label { font-weight: 600; color: #555; font-size: 9pt; margin-bottom: 2px; }
.info-value { font-size: 10pt; color: #333; }
/* Drawing Image Container */
.drawing-image-container { margin: 20px 0 30px 0; /* Space around drawing */ text-align: center; } /* Center image block */
.drawing-image { max-width: 100%; height: auto; max-height: 300px; /* Slightly increased max-height */ border: 1px solid #eee; /* Subtle border */ border-radius: 4px; }
/* Analysis Sections */
.analysis-section { margin-bottom: 20px; page-break-inside: avoid; /* Try to avoid breaking sections */ }
.analysis-content { background-color: #f8f9fa; padding: 15px; /* Slightly more padding */ border-radius: 4px; border-left: 3px solid #dee2e6; font-size: 10pt; }
.analysis-content ul { padding-left: 1.5em; } /* Re-apply list padding inside content blocks */
/* Footer */
.report-footer { margin-top: 25px; padding-top: 10px; border-top: 1px solid #e0e0e0; font-size: 8pt; color: #888; text-align: center; }
`;

// Updated HTML Template
const pdfHtmlTemplate = `
<div class="page">
    <!-- Report Header -->
    <header class="report-header">
        <h1>Psychological Drawing Analysis Report</h1>
        <div class="client-info">
            <div class="info-group">
                <div class="info-label">Client Name:</div>
                <div class="info-value">{{CLIENT_NAME}}</div>
            </div>
            <div class="info-group">
                <div class="info-label">Drawing Type:</div>
                <div class="info-value">{{DRAWING_TYPE}}</div>
            </div>
             <div class="info-group">
                <div class="info-label">Analyst:</div>
                <div class="info-value">{{ANALYST_NAME}}</div>
            </div>
            <div class="info-group">
                <div class="info-label">Analysis Date:</div>
                <div class="info-value">{{ANALYSIS_DATE}}</div>
            </div>
        </div>
    </header>

    <!-- Drawing Image Placeholder -->
    <div class="drawing-image-container">
       {{DRAWING_IMAGE_TAG}}
    </div>

    <!-- Analysis Sections - Content will be placed here -->
    {{ANALYSIS_SECTIONS}}

    <!-- Footer -->
    <footer class="report-footer">
        Report generated by PsychDraw | {{GENERATION_DATE}}
    </footer>
</div>
`;

export function AnalysisDetail() {
  const { analysisId } = useParams<{ analysisId: string }>();
  const navigate = useNavigate();
  const [analysis, setAnalysis] = useState<AnalysisDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false); 
  const [drawingImageUrl, setDrawingImageUrl] = useState<string | null>(null); 
  const [imageLoading, setImageLoading] = useState(true); 
  const { session } = useAuth(); // Get session from AuthContext
  const userEmail = session?.user?.email || 'Unknown Analyst'; // Get user email, provide fallback

  // Move parsedAnalysis state here
  const [parsedAnalysis, setParsedAnalysis] = useState<ParsedAnalysis | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  // Fetching Effect
  useEffect(() => {
    const fetchAnalysisAndImage = async () => {
        // Reset states
        setLoading(true);
        setImageLoading(true); 
        setDrawingImageUrl(null); 
        setError(null);
        setParsedAnalysis(null); // Reset parsed analysis
        setParseError(null); // Reset parse error

      try {
        // --- Fetch Analysis Data ---
        if (!analysisId) throw new Error("Analysis ID not found in URL.");
        const { data: analysisData, error: dbError } = await supabase
          .from('drawing_analyses')
          .select(
            `id, analysis_date, raw_analysis, temp_drawing_path, clients!drawing_analyses_client_id_fkey(name), drawing_types!drawing_analyses_drawing_type_id_fkey(name)`
          )
          .eq('id', analysisId)
          .single();

        if (dbError) throw dbError;
        if (!analysisData) throw new Error("Analysis not found.");

        const fetchedAnalysis = {
          id: analysisData.id,
          analysis_date: analysisData.analysis_date,
          raw_analysis: analysisData.raw_analysis,
          temp_drawing_path: analysisData.temp_drawing_path,
          client_name: analysisData.clients?.name,
          drawing_type_name: analysisData.drawing_types?.name,
        };
        setAnalysis(fetchedAnalysis); // Set analysis state

        // --- Parse Analysis JSON ---
        if (fetchedAnalysis.raw_analysis) {
            if (typeof fetchedAnalysis.raw_analysis === 'string') {
                try {
                    setParsedAnalysis(JSON.parse(fetchedAnalysis.raw_analysis));
                } catch (e) {
                    console.error("Failed to parse raw_analysis JSON string:", e);
                    setParseError("Failed to parse analysis data.");
                }
            } else if (typeof fetchedAnalysis.raw_analysis === 'object') {
                setParsedAnalysis(fetchedAnalysis.raw_analysis as ParsedAnalysis); // Assume it's already parsed
            } else {
                console.warn("raw_analysis is neither a string nor an object:", typeof fetchedAnalysis.raw_analysis);
                setParseError("Analysis data is in an unexpected format.");
            }
        } else {
            console.log("No raw_analysis data found for this analysis.");
            setParseError("No analysis data available.");
        }

        // --- Fetch Image URL ---
        if (fetchedAnalysis.temp_drawing_path) {
          const imageUrl = await getImagePublicUrl(fetchedAnalysis.temp_drawing_path);
          setDrawingImageUrl(imageUrl); // Set image URL state
        } else {
          console.log("No drawing path found for this analysis.");
          // No image URL to set
        }

      } catch (err: any) {
        console.error("Error fetching analysis details or image URL:", err);
        setError(err.message || "Failed to load analysis details.");
      } finally {
        setLoading(false); // Stop main loading
        setImageLoading(false); // Stop image loading (even if URL is null)
      }
    };

    fetchAnalysisAndImage(); // Call the combined fetch function

  }, [analysisId]); // Dependency remains analysisId

  // --- Populate Template Function ---
  const populateTemplate = (): string => {
    // Now also needs drawingImageUrl
    if (!analysis || !parsedAnalysis || !drawingImageUrl) return "";

    let analysisSectionsHtml = "";

    // Simple HTML escape helper
    const escapeHtml = (unsafe: string): string => {
        return unsafe
             .replace(/&/g, "&amp;")
             .replace(/</g, "&lt;")
             .replace(/>/g, "&gt;")
             .replace(/"/g, "&quot;")
             .replace(/'/g, "&#039;");
    }

    // Helper to render standard text sections
    const renderSection = (title: string, content?: string) => {
        if (!content) return "";
        // Escape content and replace newlines
        const safeContent = escapeHtml(content).replace(/\n/g, '<br/>');
        return `
            <section class="analysis-section">
                <h2>${escapeHtml(title)}</h2>
                <div class="analysis-content">
                    <p>${safeContent}</p> 
                </div>
            </section>
        `;
    };

    // Helper to render list sections
    const renderListSection = (title: string, items?: string[]) => {
        if (!items || items.length === 0) return "";
        // Escape each list item
        const listItemsHtml = items.map(item => `<li>${escapeHtml(item)}</li>`).join('');
        return `
            <section class="analysis-section">
                <h2>${escapeHtml(title)}</h2>
                <div class="analysis-content">
                    <ul>${listItemsHtml}</ul>
                </div>
            </section>
        `;
    };

    // Build the analysis sections HTML string
    analysisSectionsHtml += renderSection("Summary", parsedAnalysis.summary);
    analysisSectionsHtml += renderSection("Emotional Tone", parsedAnalysis.emotional_tone);
    analysisSectionsHtml += renderListSection("Key Observations", parsedAnalysis.key_observations);
    analysisSectionsHtml += renderSection("Relational Aspects", parsedAnalysis.relational_aspects);
    analysisSectionsHtml += renderListSection("Potential Conflicts", parsedAnalysis.potential_conflicts);
    analysisSectionsHtml += renderListSection("Potential Strengths", parsedAnalysis.potential_strengths);
    analysisSectionsHtml += renderListSection("Interpretive Indicators", parsedAnalysis.interpretive_indicators);
    analysisSectionsHtml += renderSection("Developmental Considerations", parsedAnalysis.developmental_considerations);
    // AI Disclaimer is intentionally omitted from the template

    // Generate the image tag using the fetched signed URL
    // Use crossOrigin="anonymous" attribute for html2canvas compatibility when fetching from Supabase
    const drawingImageTag = drawingImageUrl 
        ? `<img src="${drawingImageUrl}" crossOrigin="anonymous" alt="Drawing by ${escapeHtml(analysis.client_name || 'client')}" class="drawing-image" />`
        : '<p class="drawing-placeholder">[Drawing image could not be loaded]</p>'; // Fallback if URL failed

    // Replace placeholders in the main template
    let populatedHtml = pdfHtmlTemplate
        .replace('{{CLIENT_NAME}}', escapeHtml(analysis.client_name || 'N/A'))
        .replace('{{ANALYSIS_DATE}}', analysis.analysis_date ? new Date(analysis.analysis_date).toLocaleDateString() : 'N/A')
        .replace('{{DRAWING_TYPE}}', escapeHtml(analysis.drawing_type_name || 'N/A'))
        .replace('{{ANALYST_NAME}}', escapeHtml(userEmail)) // Add analyst email
        .replace('{{DRAWING_IMAGE_TAG}}', drawingImageTag) // Inject the image tag
        .replace('{{ANALYSIS_SECTIONS}}', analysisSectionsHtml)
        .replace('{{GENERATION_DATE}}', new Date().toLocaleDateString());

    return populatedHtml;
  };

  // Function to get Signed URL (no change needed here)
  const getImagePublicUrl = async (drawingPath: string | null): Promise<string | null> => {
    if (!drawingPath) {
        console.error("Drawing path is missing.");
        return null;
    }    
    try {
        const expiresIn = 3600; // 1 hour expiration
        const { data, error } = await supabase
            .storage
            .from('temp-drawings') 
            .createSignedUrl(drawingPath, expiresIn);
        
        if (error) {
            // Throw the error to be caught by the calling function's catch block
            throw error; 
        }
        
        if (!data?.signedUrl) {
            // If no error but no URL, throw a specific error
            throw new Error("Could not get signed URL (no data returned)."); 
        }        
        
        console.log("Retrieved signed URL (expires in 1hr):", data.signedUrl);
        return data.signedUrl;

    } catch (error) {
        // Log the error caught during signed URL generation
        console.error("Error generating signed URL:", error);
        // Return null to indicate failure, the calling function will handle it
        return null; 
    }
  };

  // --- PDF Export Function (Using Iframe and HTML Template) ---
  const handleExportPdf = async () => {
    // Check required data - now includes drawingImageUrl required by populateTemplate
    if (!analysis || !drawingImageUrl || !parsedAnalysis) { 
        setError("Analysis data, parsed results, or drawing image is missing for PDF export.");
        return;
    }

    setIsExporting(true);
    setError(null);

    // Create a hidden iframe
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.width = '794px'; // A4 width @ 96dpi
    iframe.style.height = '1123px'; // A4 height @ 96dpi (helps render full page initially)
    iframe.style.left = '-9999px'; // Off-screen
    iframe.style.top = '0px';
    iframe.style.border = 'none'; 

    document.body.appendChild(iframe);

    try {
        // Populate the complete HTML template (includes drawing img tag now)
        const populatedHtml = populateTemplate();
        const iframeContent = `<style>${pdfStyles}</style>${populatedHtml}`;        
        
        // Set iframe content using srcdoc
        iframe.srcdoc = iframeContent;

        // Wait for iframe to load its content (including potentially the image)
        await new Promise<void>((resolve, reject) => {
            let loaded = false;
            const timer = setTimeout(() => {
                if (!loaded) {
                    console.warn("iframe onload timeout potentially occurred");
                    // Resolve anyway, maybe content loaded but onload didn't fire
                    resolve(); 
                }
            }, 7000); // 7 second timeout

            iframe.onload = () => { 
                loaded = true; 
                clearTimeout(timer); 
                console.log("iframe loaded successfully.");
                resolve(); 
            };
            iframe.onerror = (err) => { 
                clearTimeout(timer);
                console.error("iframe loading error:", err);
                reject(new Error("Failed to load iframe content for PDF generation."));
            };
        });

        // Get the content document and the specific page element from the iframe
        const iframeDoc = iframe.contentWindow?.document;
        if (!iframeDoc) { throw new Error("Could not access iframe document."); }
        const pageElementInIframe = iframeDoc.querySelector('.page') as HTMLElement;
        if (!pageElementInIframe) { throw new Error("Could not find .page element within the iframe content."); }

        // A small delay might still help ensure images are fully painted in some browsers
        await new Promise(resolve => setTimeout(resolve, 200)); 

        // --- 1. Prepare PDF --- 
        const pdf = new jsPDF({ orientation: 'p', unit: 'pt', format: 'a4' });
        const pageHeight = pdf.internal.pageSize.height;
        const pageWidth = pdf.internal.pageSize.width;
        // Margins are handled by the HTML template's padding

        // --- 2. Capture ENTIRE HTML Template from Iframe --- 
        const canvas = await html2canvas(pageElementInIframe, { 
             scale: 2, // Improves resolution
             useCORS: true, // Needed for images from Supabase URL
             allowTaint: true, // Often needed with useCORS
             logging: false, // Keep console clean unless debugging
             width: pageElementInIframe.scrollWidth, // Capture full width of content
             height: pageElementInIframe.scrollHeight, // Capture full scroll height
             windowWidth: pageElementInIframe.scrollWidth,
             windowHeight: pageElementInIframe.scrollHeight,
             // Ensure background is rendered if needed (though CSS sets it white)
             backgroundColor: null // Use CSS background
        });

        // --- 3. Add Captured Template to PDF (Handling Pagination) --- 
        const imgData = canvas.toDataURL('image/png');
        const imgProps = pdf.getImageProperties(imgData);
        
        const pdfMargin = 40; // PDF margin in points
        const pdfImageWidth = pageWidth - 2 * pdfMargin; // Width available within margins
        const pdfImageHeight = (imgProps.height * pdfImageWidth) / imgProps.width; // Total height of the scaled image
        
        const pageContentHeight = pageHeight - 2 * pdfMargin; // Max content height per page within margins
        const numPages = Math.ceil(pdfImageHeight / pageContentHeight); // Calculate total pages needed
        
        let position = pdfMargin; // Initial Y position for drawing on PDF (starts at top margin)
        let sourceY = 0; // The Y coordinate in the *source canvas* to start drawing from

        for (let i = 1; i <= numPages; i++) {
            // Add new page for pages after the first
            if (i > 1) {
                pdf.addPage();
            }
            
            // Add the image slice for the current page
            // The position argument dictates where the *source image's* top-left (or adjusted top-left) 
            // should be placed relative to the PDF page's top-left.
            // By subtracting pageHeight repeatedly, we effectively shift the source image up
            // so the correct slice aligns with the top margin.
            pdf.addImage(imgData, 'PNG', pdfMargin, position, pdfImageWidth, pdfImageHeight);
            
            // Adjust the position for the next page's draw operation
            position -= pageHeight; 
        }
        
        // --- 4. Save PDF --- 
        const filename = `Report-${analysis.client_name?.replace(/\s+/g, '_') || 'Client'}-${new Date().toISOString().split('T')[0]}.pdf`;
        pdf.save(filename);

    } catch (err: any) {
        console.error("Error exporting PDF:", err);
        setError(`Failed to export PDF: ${err.message}`);
    } finally {
        setIsExporting(false);
        document.body.removeChild(iframe); // Clean up hidden iframe
    }
  };
  
  // --- Web UI Rendering Helpers --- (Moved down for clarity)
  const renderListItems = (items?: string[]) => {
    if (!items || items.length === 0) return null;
    return (
        <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
          {items.map((item, index) => ( <li key={index}>{item}</li> ))}
        </ul>
    );
  };

  const renderTextSectionItem = (title: string, text?: string) => {
    if (!text) return null;
    return (
      <div className="mb-4">
        <h4 className="text-md font-semibold mb-1">{title}</h4>
        <p className="text-sm text-muted-foreground">{text}</p>
      </div>
    );
  };


  // --- Component Return (Web UI) ---
  return (
    <div className="w-full max-w-3xl mx-auto p-4 space-y-6">
      {/* Header (Web UI) */}
      <div className="relative flex justify-center items-center">
        {/* Back Button */}
        <Button 
          variant="ghost" 
          size="icon" 
          className="absolute left-0 top-1/2 -translate-y-1/2"
          onClick={() => navigate(-1)}
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        
        {/* Title */}
        <h2 className="text-xl font-semibold text-center">Analysis Details</h2>

        {/* Export Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="absolute right-0 top-1/2 -translate-y-1/2"
              onClick={handleExportPdf}
              // Disable if essential data for PDF is missing
              disabled={!analysis || loading || isExporting || !drawingImageUrl || !parsedAnalysis} 
              aria-label="Export PDF"
            >
              {isExporting ? (
                <svg className="animate-spin h-4 w-4 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <Download className="h-4 w-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Export PDF</p>
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Loading State */}
      {loading && <p className="text-center">Loading analysis...</p>}
      
      {/* Error State */}
      {error && !loading && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{error}</p>
          </CardContent>
        </Card>
      )}
      
      {/* Content Display (Web UI) */}
      {analysis && !loading && !error && (
        <>
          {/* Card for Basic Info (Web UI) */}
          <Card>
            <CardHeader>
              <CardTitle>{analysis.client_name || 'Client N/A'}</CardTitle>
              <CardDescription>
                {analysis.drawing_type_name || 'Type N/A'} - Analyzed on {analysis.analysis_date ? new Date(analysis.analysis_date).toLocaleString() : 'Date N/A'}
              </CardDescription>
            </CardHeader>
            {/* Drawing Image (Web UI) */}
            <CardContent>
              {imageLoading && <p className="text-sm text-muted-foreground">Loading drawing...</p>}
              {!imageLoading && drawingImageUrl && (
                <img 
                  src={drawingImageUrl} 
                  alt={`Drawing by ${analysis.client_name || 'client'}`} 
                  className="rounded-md border max-w-full h-auto mx-auto my-4" // Styling for web view
                  style={{ maxHeight: '400px' }} // Limit height in web view
                />
              )}
              {!imageLoading && !drawingImageUrl && analysis.temp_drawing_path && (
                 <p className="text-sm text-destructive">Could not load drawing image.</p>
              )}
              {!imageLoading && !analysis.temp_drawing_path && (
                 <p className="text-sm text-muted-foreground">No drawing image associated with this analysis.</p>
              )}
            </CardContent> 
          </Card>

          {/* Card for Analysis Results (Web UI) */}
          <Card>
            <CardHeader>
             <CardTitle>Analysis Breakdown</CardTitle>
             {/* Display parse error if occurred */}
             {parseError && !parsedAnalysis && (
                <CardDescription className="text-destructive">{parseError}</CardDescription>
             )}
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Render parsed content if available */}
              {parsedAnalysis ? (
                <>
                  {renderTextSectionItem("Summary", parsedAnalysis.summary)}
                  {renderTextSectionItem("Emotional Tone", parsedAnalysis.emotional_tone)}
                  
                  {parsedAnalysis.key_observations && parsedAnalysis.key_observations.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-md font-semibold mb-1">Key Observations</h4>
                      {renderListItems(parsedAnalysis.key_observations)}
                    </div>
                  )}
                  {renderTextSectionItem("Relational Aspects", parsedAnalysis.relational_aspects)}
                  {parsedAnalysis.potential_conflicts && parsedAnalysis.potential_conflicts.length > 0 && (
                     <div className="mb-4">
                       <h4 className="text-md font-semibold mb-1">Potential Conflicts</h4>
                       {renderListItems(parsedAnalysis.potential_conflicts)}
                     </div>
                  )}
                   {parsedAnalysis.potential_strengths && parsedAnalysis.potential_strengths.length > 0 && (
                     <div className="mb-4">
                       <h4 className="text-md font-semibold mb-1">Potential Strengths</h4>
                       {renderListItems(parsedAnalysis.potential_strengths)}
                     </div>
                   )}
                   {parsedAnalysis.interpretive_indicators && parsedAnalysis.interpretive_indicators.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-md font-semibold mb-1">Interpretive Indicators</h4>
                        {renderListItems(parsedAnalysis.interpretive_indicators)}
                      </div>
                   )}
                  {renderTextSectionItem("Developmental Considerations", parsedAnalysis.developmental_considerations)}
                  {/* AI Disclaimer intentionally not shown in web UI either */}
                </>
              ) : (
                // Show message if parsing is done but result is null (e.g., due to parse error)
                 !parseError && <p className="text-sm text-muted-foreground">Analysis content not available.</p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
} 