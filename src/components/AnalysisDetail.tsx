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

export function AnalysisDetail() {
  const { analysisId } = useParams<{ analysisId: string }>();
  const navigate = useNavigate();
  const [analysis, setAnalysis] = useState<AnalysisDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false); // State for export button
  const [drawingImageUrl, setDrawingImageUrl] = useState<string | null>(null); // State for image URL
  const [imageLoading, setImageLoading] = useState(true); // State for image loading

  useEffect(() => {
    const fetchAnalysisAndImage = async () => {
      setLoading(true);
      setImageLoading(true); // Start image loading state
      setDrawingImageUrl(null); // Reset image URL
      setError(null);

      try {
        // Fetch analysis details (modified slightly from original useEffect)
        if (!analysisId) throw new Error("Analysis ID not found in URL.");

        const { data: analysisData, error: dbError } = await supabase
          .from('drawing_analyses')
          .select(
            // Use constraint names for explicit hinting
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
        setAnalysis(fetchedAnalysis);

        // Now fetch the image URL using the path from analysisData
        if (fetchedAnalysis.temp_drawing_path) {
          const imageUrl = await getImagePublicUrl(fetchedAnalysis.temp_drawing_path);
          setDrawingImageUrl(imageUrl);
        } else {
          console.log("No drawing path found for this analysis.");
        }

      } catch (err: any) {
        console.error("Error fetching analysis details or image URL:", err);
        setError(err.message || "Failed to load analysis details.");
      } finally {
        setLoading(false);
        setImageLoading(false); // End image loading state
      }
    };

    fetchAnalysisAndImage(); // Call the combined fetch function
  }, [analysisId]); // Dependency remains analysisId

  // Helper function to render list items
  const renderList = (title: string, items?: string[]) => {
    if (!items || items.length === 0) return null;
    return (
      <div className="mb-4">
        <h4 className="text-md font-semibold mb-1">{title}</h4>
        <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
          {items.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      </div>
    );
  };

  // Helper function to render text sections
  const renderTextSection = (title: string, text?: string) => {
    if (!text) return null;
    return (
      <div className="mb-4">
        <h4 className="text-md font-semibold mb-1">{title}</h4>
        <p className="text-sm text-muted-foreground">{text}</p>
      </div>
    );
  };

  // Function to get a Signed URL for image from Supabase Storage
  const getImagePublicUrl = async (drawingPath: string | null): Promise<string | null> => {
    if (!drawingPath) {
        console.error("Drawing path is missing.");
        return null;
    }
    
    try {
        // Use createSignedUrl instead of getPublicUrl
        const expiresIn = 3600; // URL expires in 1 hour
        const { data, error } = await supabase
            .storage
            .from('temp-drawings') 
            .createSignedUrl(drawingPath, expiresIn);
        
        if (error) {
            console.error("Error creating signed URL:", error);
            return null;
        }
        
        if (!data?.signedUrl) {
            console.error("Could not get signed URL for", drawingPath);
            return null;
        }
        
        console.log("Retrieved signed URL (expires in 1hr):", data.signedUrl);
        return data.signedUrl;

    } catch (error) {
        console.error("Error generating signed URL:", error);
        return null;
    }
  };

  // Function to handle PDF export
  const handleExportPdf = async () => {
    if (!analysis || !drawingImageUrl || !parsedAnalysis) { // Need analysis, image URL, and parsed data
        setError("Analysis data, parsed results, or drawing image URL is missing.");
        return;
    };

    setIsExporting(true);
    setError(null); // Clear previous errors

    try {
        // --- 1. Create PDF Document --- 
        const pdf = new jsPDF({
            orientation: 'p', // portrait
            unit: 'pt', // points
            format: 'a4' // A4 page size
        });

        const pageHeight = pdf.internal.pageSize.height;
        const pageWidth = pdf.internal.pageSize.width;
        const margin = 40; // Page margin in points
        const contentWidth = pageWidth - 2 * margin;
        let currentY = margin; // Track current Y position on the page
        const lineSpacing = 12; // Basic line spacing
        const sectionSpacing = 20; // Space between sections

        // Helper to add text and handle page breaks
        const addWrappedText = (text: string, x: number, y: number, options?: any): number => {
            const lines = pdf.splitTextToSize(text, contentWidth);
            const textHeight = lines.length * lineSpacing * (options?.fontSize ? options.fontSize / 10 : 1); // Estimate height
            
            if (y + textHeight > pageHeight - margin) {
                pdf.addPage();
                y = margin;
            }
            pdf.text(lines, x, y, options);
            return y + textHeight + (lineSpacing / 2); // Return new Y position
        };

        // Helper to add a list
        const addList = (title: string, items?: string[]): number => {
            if (!items || items.length === 0) return currentY;

            const titleHeight = lineSpacing * 1.2; // Estimate title height
            const itemsHeight = items.length * lineSpacing;
            const totalHeight = titleHeight + itemsHeight;

            if (currentY + totalHeight > pageHeight - margin) {
                 pdf.addPage();
                 currentY = margin;
            }

            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(11);
            pdf.text(title, margin, currentY);
            currentY += titleHeight;

            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(10);
            items.forEach(item => {
                if (currentY + lineSpacing > pageHeight - margin) { // Check before each item
                    pdf.addPage();
                    currentY = margin;
                }
                pdf.text(`• ${item}`, margin + 10, currentY); // Indent bullets
                currentY += lineSpacing;
            });
            return currentY + sectionSpacing;
        };

        // --- 2. Add Header --- 
        pdf.setFontSize(18);
        pdf.setFont('helvetica', 'bold');
        pdf.text("Psychological Drawing Analysis Report", pageWidth / 2, currentY, { align: 'center' });
        currentY += 30;

        // --- 3. Add Client/Analysis Info --- 
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        pdf.text(`Client: ${analysis.client_name || 'N/A'}`, margin, currentY);
        currentY += lineSpacing;
        pdf.text(`Drawing Type: ${analysis.drawing_type_name || 'N/A'}`, margin, currentY);
        currentY += lineSpacing;
        pdf.text(`Analysis Date: ${analysis.analysis_date ? new Date(analysis.analysis_date).toLocaleString() : 'N/A'}`, margin, currentY);
        currentY += sectionSpacing + 10; // Add space before drawing

        // --- 4. Add Drawing Image --- 
        const img = new Image();
        img.crossOrigin = "anonymous"; 
        await new Promise<void>((resolve, reject) => {
            img.onload = () => {
                try {
                    const imgProps = pdf.getImageProperties(img);
                    const aspectRatio = imgProps.width / imgProps.height;
                    let pdfImgWidth = contentWidth;
                    let pdfImgHeight = pdfImgWidth / aspectRatio;
                    const maxHeight = pageHeight * 0.4;

                    if (pdfImgHeight > maxHeight) {
                        pdfImgHeight = maxHeight;
                        pdfImgWidth = pdfImgHeight * aspectRatio;
                    }
                    
                    // Add page break check for image
                    if (currentY + pdfImgHeight > pageHeight - margin) {
                         pdf.addPage();
                         currentY = margin;
                    }

                    const xPos = (pageWidth - pdfImgWidth) / 2;
                    pdf.addImage(img, 'JPEG', xPos, currentY, pdfImgWidth, pdfImgHeight);
                    currentY += pdfImgHeight + sectionSpacing;
                    resolve();
                } catch (e) { reject(e); }
            };
            img.onerror = (err) => reject(new Error("Failed to load drawing image for PDF."));
            img.src = drawingImageUrl;
        });

        // --- 5. Add Parsed Analysis Content --- 
        
        // Check for page break before starting analysis section
        if (currentY > pageHeight - margin - 50) { // Need ~50pts for a heading + some text
            pdf.addPage();
            currentY = margin;
        }

        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.text("Analysis Breakdown", margin, currentY);
        currentY += lineSpacing * 1.5;

        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'italic');
        if (parsedAnalysis.ai_disclaimer) {
           currentY = addWrappedText(parsedAnalysis.ai_disclaimer, margin, currentY, {fontSize: 9});
           currentY += sectionSpacing;
        }
        
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        
        // Render each section
        if(parsedAnalysis.summary) {
            pdf.setFont('helvetica', 'bold');
            pdf.text("Summary", margin, currentY);
            currentY += lineSpacing * 1.2;
            pdf.setFont('helvetica', 'normal');
            currentY = addWrappedText(parsedAnalysis.summary, margin, currentY);
            currentY += sectionSpacing;
        }

        if(parsedAnalysis.emotional_tone) {
            pdf.setFont('helvetica', 'bold');
            pdf.text("Emotional Tone", margin, currentY);
            currentY += lineSpacing * 1.2;
            pdf.setFont('helvetica', 'normal');
            currentY = addWrappedText(parsedAnalysis.emotional_tone, margin, currentY);
            currentY += sectionSpacing;
        }

        currentY = addList("Key Observations", parsedAnalysis.key_observations);
        currentY = addList("Potential Conflicts", parsedAnalysis.potential_conflicts);
        currentY = addList("Potential Strengths", parsedAnalysis.potential_strengths);
        currentY = addList("Interpretive Indicators", parsedAnalysis.interpretive_indicators);
        
        if(parsedAnalysis.relational_aspects) { // Add other text sections if they exist
             pdf.setFont('helvetica', 'bold');
             pdf.text("Relational Aspects", margin, currentY);
             currentY += lineSpacing * 1.2;
             pdf.setFont('helvetica', 'normal');
             currentY = addWrappedText(parsedAnalysis.relational_aspects, margin, currentY);
             currentY += sectionSpacing;
        }
        if(parsedAnalysis.developmental_considerations) {
             pdf.setFont('helvetica', 'bold');
             pdf.text("Developmental Considerations", margin, currentY);
             currentY += lineSpacing * 1.2;
             pdf.setFont('helvetica', 'normal');
             currentY = addWrappedText(parsedAnalysis.developmental_considerations, margin, currentY);
             currentY += sectionSpacing;
        }

        // --- 6. Save PDF --- 
        const filename = `Report-${analysis.client_name?.replace(/\s+/g, '_') || 'Client'}-${new Date().toISOString().split('T')[0]}.pdf`;
        pdf.save(filename);

    } catch (err: any) {
        console.error("Error exporting PDF:", err);
        setError(`Failed to export PDF: ${err.message}`);
    } finally {
        setIsExporting(false);
    }
  };

  // Attempt to parse the analysis JSON
  let parsedAnalysis: ParsedAnalysis | null = null;
  let parseError: string | null = null;
  if (analysis?.raw_analysis) {
    if (typeof analysis.raw_analysis === 'string') {
      try {
        parsedAnalysis = JSON.parse(analysis.raw_analysis);
      } catch (e) {
        console.error("Failed to parse raw_analysis JSON string:", e);
        parseError = "Failed to parse analysis data (string format invalid). Displaying raw format instead.";
        parsedAnalysis = null; // Ensure it's null on string parse error
      }
    } else if (typeof analysis.raw_analysis === 'object') {
      // It's already an object, use it directly
      parsedAnalysis = analysis.raw_analysis as ParsedAnalysis;
    } else {
      // Handle unexpected types if necessary
      console.warn("raw_analysis is neither a string nor an object:", typeof analysis.raw_analysis);
      parseError = "Analysis data is in an unexpected format.";
    }
  } else if (analysis) {
      // Handle case where analysis exists but raw_analysis is null/undefined
      parseError = "No analysis data available.";
  }

  return (
    <div className="w-full max-w-3xl mx-auto p-4 space-y-6">
      {/* Header with Back Button, Title, and Export Button */}
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

        {/* Export Button - Icon only with Tooltip */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon" // Changed to icon size
              className="absolute right-0 top-1/2 -translate-y-1/2"
              onClick={handleExportPdf}
              disabled={!analysis || loading || isExporting}
              aria-label="Export PDF"
            >
              {isExporting ? (
                <svg className="animate-spin h-4 w-4 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <Download className="h-4 w-4" /> // Removed margin
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
      
      {/* Content Display */}
      {analysis && !loading && !error && (
        <>
          {/* Card for Basic Info - Add ID */}
          <Card id="analysis-info-area">
            <CardHeader>
              <CardTitle>{analysis.client_name || 'Client N/A'}</CardTitle>
              <CardDescription>
                {analysis.drawing_type_name || 'Type N/A'} - Analyzed on {analysis.analysis_date ? new Date(analysis.analysis_date).toLocaleString() : 'Date N/A'}
              </CardDescription>
            </CardHeader>
            {/* Display Drawing Image */} 
            <CardContent>
              {imageLoading && <p className="text-sm text-muted-foreground">Loading drawing...</p>}
              {!imageLoading && drawingImageUrl && (
                <img 
                  src={drawingImageUrl} 
                  alt={`Drawing by ${analysis.client_name || 'client'}`} 
                  className="rounded-md border max-w-full h-auto mx-auto my-4" // Added styling
                  style={{ maxHeight: '400px' }} // Limit height
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

          {/* Card for Analysis Results - Add an ID for html2canvas */}
          <Card id="analysis-content-area">
            <CardHeader>
              <CardTitle>Analysis Breakdown</CardTitle>
              {parsedAnalysis?.ai_disclaimer && (
                <CardDescription>{parsedAnalysis.ai_disclaimer}</CardDescription>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {parseError && (
                <div className="text-destructive mb-4">
                  <p>{parseError}</p>
                  <pre className="mt-2 p-2 bg-muted rounded text-sm overflow-auto">
                    {JSON.stringify(analysis.raw_analysis, null, 2)}
                  </pre>
                </div>
              )}
              
              {parsedAnalysis && !parseError && (
                <>
                  {renderTextSection("Summary", parsedAnalysis.summary)}
                  {renderTextSection("Emotional Tone", parsedAnalysis.emotional_tone)}
                  {renderList("Key Observations", parsedAnalysis.key_observations)}
                  {renderTextSection("Relational Aspects", parsedAnalysis.relational_aspects)}
                  {renderList("Potential Conflicts", parsedAnalysis.potential_conflicts)}
                  {renderList("Potential Strengths", parsedAnalysis.potential_strengths)}
                  {renderList("Interpretive Indicators", parsedAnalysis.interpretive_indicators)}
                </>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
} 