# PsychDraw Project Summary

## Project Overview
PsychDraw is going to be a mobile application designed for psychologists to analyze psychological drawings from their clients/patients. The app allows psychologists to take photos of client drawings, leverages AI image analysis to generate insights, and produces professional reports with clinical suggestions. Key features include:

- Camera integration for capturing drawings
- AI-powered drawing analysis 
- Professional report generation
- Client portfolio building over time
- Longitudinal tracking of client themes and insights
- Mobile-first design for both Android and iOS

## Technical Stack & Implementation
- **Frontend**: V0-generated application using Shadcn UI components
- **Backend**: Supabase for authentication, database, and storage
- **Target Platforms**: Mobile-first (Android and iOS)
- **Business Model**: Subscription-based at 199 MXN (~$10 USD) per month
- **Architecture**: Multi-tenant design to serve multiple psychologists

## LLM Options for Drawing Analysis
Three main contenders for the image analysis component:

1. **Gemini 1.5 Pro**
   - Cost: $0.05-0.08 USD per analysis ($5-8 per 100)
   - Pros: Most affordable option
   - Cons: May provide less nuanced psychological insights

2. **Other cheap Gemini LLM vision models**
     - Im open to suggestions here

## Project Implementation Roadmap

### Phase 1: Scope Definition & Planning (Week 1)
- Create detailed feature list
- Draft user flows
- Define data models
- Create mockups of key screens

### Phase 2: Technical Setup (Week 2)
- Set up Supabase project
- Configure database tables and relationships
- Set up authentication
- Create storage buckets
- Initialize GitHub repository
- Set up development environment

### Phase 3: MVP Development (Weeks 3-5)
- Implement authentication
- Create user profile management
- Build patient management
- Develop camera/image functionality
- Create LLM integration
- Build report generation

### Immediate First Steps (Next 48 Hours)
- Create project documentation
- Set up development infrastructure
- Draft database schema
- Create basic wireframes
- Set up initial V0 project