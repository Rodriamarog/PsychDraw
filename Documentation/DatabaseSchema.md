# PsychDraw Database Schema

## Overview
This schema is designed for a Supabase implementation with PostgreSQL. The structure emphasizes:
- Clean multitenancy through psychologists and their clients
- Secure storage of analysis data and reports
- Efficient retrieval of historical data
- Simple extensibility for future features

## Tables

### 1. psychologists
Primary table for user accounts (psychologists using the app).

```sql
CREATE TABLE psychologists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT TRUE
);
```

### -- New Type Definition for Gender --
```sql
-- Create the gender enum type before defining the clients table
CREATE TYPE public.gender_enum AS ENUM ('Male', 'Female', 'Non-Binary');
```

### 2. clients
Table for storing client information, including age and gender.

```sql
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  psychologist_id UUID NOT NULL REFERENCES psychologists(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  age INT, -- Added age column
  gender gender_enum, -- Added gender column using the enum type
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Index for quick client lookup by psychologist
  UNIQUE(psychologist_id, name)
);
```

### 3. drawing_types
Table for storing standardized psychological drawing test types.

```sql
CREATE TABLE drawing_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert common psychological drawing tests
INSERT INTO drawing_types (name, description) VALUES
  ('House-Tree-Person (HTP)', 'A projective personality test where client draws a house, a tree, and a person'),
  ('Draw-A-Person (DAP)', 'Focuses only on human figure drawing for personality assessment'),
  ('Kinetic Family Drawing (KFD)', 'Client draws their family engaged in activities'),
  ('Person Under the Rain', 'Assesses how the client deals with stress and adversity'),
  ('Draw-A-Family', 'Client draws their family, revealing family dynamics and relationships'),
  ('Tree Test (Koch''s Tree Test)', 'Focuses only on tree drawing for personality assessment');
```

### 4. drawing_analyses
Table for storing analysis sessions.

```sql
CREATE TABLE drawing_analyses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  psychologist_id UUID NOT NULL REFERENCES psychologists(id) ON DELETE CASCADE,
  drawing_type_id UUID NOT NULL REFERENCES drawing_types(id),
  
  -- Analysis metadata
  analysis_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  title TEXT DEFAULT 'Psychological Drawing Analysis',
  
  -- LLM response storage
  raw_analysis JSONB NOT NULL,
  
  -- Temporary drawing storage (only until report is generated)
  temp_drawing_path TEXT NOT NULL,
  drawing_processed BOOLEAN DEFAULT FALSE,
  
  -- For quick lookups
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Organizational indexes
  CONSTRAINT fk_psychologist FOREIGN KEY (psychologist_id) REFERENCES psychologists(id),
  CONSTRAINT fk_client FOREIGN KEY (client_id) REFERENCES clients(id),
  CONSTRAINT fk_drawing_type FOREIGN KEY (drawing_type_id) REFERENCES drawing_types(id)
);

-- Index for efficient retrieval of analyses by client
CREATE INDEX idx_drawing_analyses_client_id ON drawing_analyses(client_id);
-- Index for efficient retrieval of all analyses by psychologist
CREATE INDEX idx_drawing_analyses_psychologist_id ON drawing_analyses(psychologist_id);
-- Index for retrieving analyses by drawing type
CREATE INDEX idx_drawing_analyses_drawing_type ON drawing_analyses(drawing_type_id);
-- Index for chronological sorting
CREATE INDEX idx_drawing_analyses_date ON drawing_analyses(analysis_date);
-- Index for finding unprocessed drawings that need cleanup
CREATE INDEX idx_drawing_analyses_unprocessed ON drawing_analyses(drawing_processed) WHERE drawing_processed = FALSE;
```

### 5. reports
Table for storing generated reports.

```sql
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  analysis_id UUID NOT NULL REFERENCES drawing_analyses(id) ON DELETE CASCADE,
  
  -- Report storage details
  report_path TEXT NOT NULL,
  report_storage_bucket TEXT NOT NULL DEFAULT 'reports',
  
  -- Report metadata
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- For ease of management
  CONSTRAINT fk_analysis FOREIGN KEY (analysis_id) REFERENCES drawing_analyses(id)
);

-- Index for efficient report retrieval by analysis
CREATE INDEX idx_reports_analysis_id ON reports(analysis_id);
```

### 6. api_usage
Table for tracking Gemini API usage per psychologist.

```sql
CREATE TABLE api_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  psychologist_id UUID NOT NULL REFERENCES psychologists(id) ON DELETE CASCADE,
  analysis_id UUID REFERENCES drawing_analyses(id) ON DELETE SET NULL,
  
  -- API request details
  request_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  month_year TEXT NOT NULL, -- Format: 'YYYY-MM' (for monthly usage counting)
  request_status TEXT NOT NULL, -- 'success', 'error', etc.
  estimated_cost DECIMAL(10, 6), -- in USD
  
  -- For troubleshooting
  error_message TEXT,
  
  -- Index for usage reports
  CONSTRAINT fk_api_usage_psychologist FOREIGN KEY (psychologist_id) REFERENCES psychologists(id),
  CONSTRAINT fk_api_usage_analysis FOREIGN KEY (analysis_id) REFERENCES drawing_analyses(id)
);

-- Index for efficient usage retrieval by psychologist
CREATE INDEX idx_api_usage_psychologist_id ON api_usage(psychologist_id);
-- Index for usage by month
CREATE INDEX idx_api_usage_month_year ON api_usage(psychologist_id, month_year);

-- RLS Policy for api_usage
CREATE POLICY api_usage_access ON api_usage
  FOR ALL
  USING (auth.uid() = psychologist_id);
```

## Storage Buckets
In Supabase, we'll create two storage buckets:

1. `temp_drawings` - For temporarily storing drawings during analysis (auto-cleanup)
2. `reports` - For storing the generated PDF reports (long-term storage)

## Row-Level Security (RLS) Policies
Security is implemented through RLS policies:

### For psychologists table:
```sql
-- Users can only access their own data
CREATE POLICY psychologist_access ON psychologists
  FOR ALL
  USING (auth.uid() = id);
```

### For clients table:
```sql
-- Psychologists can only access their own clients
CREATE POLICY client_access ON clients
  FOR ALL
  USING (auth.uid() = psychologist_id);
```

### For drawing_analyses table:
```sql
-- Psychologists can only access analyses for their clients
CREATE POLICY analysis_access ON drawing_analyses
  FOR ALL
  USING (auth.uid() = psychologist_id);
```

### For reports table:
```sql
-- Psychologists can only access reports linked to their analyses
CREATE POLICY report_access ON reports
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM drawing_analyses
      WHERE drawing_analyses.id = reports.analysis_id
      AND drawing_analyses.psychologist_id = auth.uid()
    )
  );
```

### For storage buckets:
```sql
-- Temporary drawings bucket policy
CREATE POLICY temp_drawings_access ON storage.objects
  FOR ALL
  USING (
    -- Extract psychologist_id from path
    (storage.foldername(name))[1]::uuid = auth.uid()
  );

-- Reports bucket policy
CREATE POLICY reports_access ON storage.objects
  FOR ALL
  USING (
    -- Extract psychologist_id from path
    (storage.foldername(name))[1]::uuid = auth.uid()
  );
```

## File Storage Structure
Files will be stored with paths that enforce security:

- Temporary drawings: `{psychologist_id}/{client_id}/{timestamp}_{filename}.jpg` (auto-deleted after processing)
- Reports: `{psychologist_id}/{client_id}/{analysis_id}_{timestamp}.pdf` (permanent storage)

## Database Triggers
For automatic timestamps:

```sql
-- Update timestamps automatically
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all relevant tables
CREATE TRIGGER update_psychologist_timestamp BEFORE UPDATE ON psychologists FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER update_client_timestamp BEFORE UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER update_analysis_timestamp BEFORE UPDATE ON drawing_analyses FOR EACH ROW EXECUTE FUNCTION update_timestamp();
```

## Cleanup Jobs

### Drawing Cleanup Function
A Postgres function to clean up processed drawings:

```sql
-- Function to clean up processed drawings
CREATE OR REPLACE FUNCTION cleanup_processed_drawings()
RETURNS INTEGER AS $$
DECLARE
  cleaned_count INTEGER := 0;
  drawing_record RECORD;
BEGIN
  -- Find analyses with processed drawings
  FOR drawing_record IN 
    SELECT id, temp_drawing_path, psychologist_id
    FROM drawing_analyses
    WHERE drawing_processed = TRUE
    AND temp_drawing_path IS NOT NULL
    LIMIT 100 -- Process in batches to avoid long transactions
  LOOP
    -- Delete the file from storage (call to Supabase storage REST API)
    -- This requires a Supabase Edge Function to perform the actual file deletion
    -- The Edge Function would be called with the temp_drawing_path
    
    -- Mark the record as cleaned up by clearing the path
    UPDATE drawing_analyses
    SET temp_drawing_path = NULL
    WHERE id = drawing_record.id;
    
    cleaned_count := cleaned_count + 1;
  END LOOP;
  
  RETURN cleaned_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Scheduled Cleaning Job
Set up a scheduled job to run the cleanup function:

```sql
-- Create a scheduled job to run every hour
-- This requires the pg_cron extension to be enabled in Supabase
SELECT cron.schedule(
  'cleanup-drawings-hourly', -- job name
  '0 * * * *',               -- cron schedule (hourly)
  $$SELECT cleanup_processed_drawings()$$
);
```

### Edge Function for File Deletion
Create a Supabase Edge Function named `delete-drawing.js`:

```javascript
// delete-drawing.js
import { createClient } from '@supabase/supabase-js'

export async function handler(event, context) {
  try {
    // Get drawing path from request
    const { drawingPath, psychologistId } = JSON.parse(event.body);
    
    if (!drawingPath || !psychologistId) {
      return { statusCode: 400, body: 'Missing required parameters' };
    }
    
    // Initialize Supabase client
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Extract bucket and path
    const pathParts = drawingPath.split('/');
    const bucketName = 'temp_drawings';
    const storagePath = pathParts.slice(1).join('/');
    
    // Delete file from storage
    const { error } = await supabase
      .storage
      .from(bucketName)
      .remove([storagePath]);
      
    if (error) {
      console.error('Error deleting file:', error);
      return { statusCode: 500, body: JSON.stringify(error) };
    }
    
    return { 
      statusCode: 200, 
      body: JSON.stringify({ success: true, message: 'File deleted successfully' }) 
    };
  } catch (error) {
    console.error('Unexpected error:', error);
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal server error' }) };
  }
}
```

## Notes and Considerations

1. **Multitenancy**: This schema strictly separates data by psychologist, ensuring data isolation.

2. **Performance**: Indexes are created for common query patterns to ensure fast retrieval.

3. **Security**: Row-level security ensures users can only access their own data.

4. **Storage Optimization**: 
   - Original drawings are stored temporarily and deleted after report generation
   - Only reports (with embedded compressed images) are kept long-term
   - A background job should be created to clean up processed drawings

5. **API Key Management**: For the MVP, the Gemini API key should be stored server-side in environment variables and accessed through Edge Functions.

6. **Usage Tracking**: The simplified `api_usage` table tracks all API calls and can be used to:
   - Monitor costs
   - Calculate monthly usage
   - Implement usage limits later

7. **Future Extensions**: The schema allows for easy additions such as:
   - Client demographic information (Age and Gender added!)
   - Dedicated subscription tables
   - Drawing categorization/tagging
   - More detailed report metadata
   - Longitudinal analysis linking

8. **Backup Strategy**: Daily backups should be configured in Supabase.

This schema provides a secure, efficient foundation for the PsychDraw MVP while allowing for future growth as the application evolves.