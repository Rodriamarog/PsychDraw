# PsychDraw MVP User Flows

## 1. Authentication Flow
1. User opens app
2. User taps "Sign in with Google" button
3. Google authentication popup appears
4. User completes Google authentication
5. On first login: User is prompted to confirm/complete basic profile info
6. User is redirected to Client List screen

## 2. Client Management Flow
1. User views Client List screen (home screen after login)
2. User taps "Add New Client" button
3. User enters client name
4. User taps "Save" button
5. New client appears in client list
6. User taps on a client to select them
7. User is taken to Client Detail screen

## 3. Drawing Analysis & Report Flow
1. From Client Detail screen, user taps "New Analysis" button
2. User selects the drawing type from a list (HTP, DAP, Person Under the Rain, etc.)
3. User is presented with two options: "Take Photo" or "Upload Image"
4. If "Take Photo":
   - Camera opens
   - User takes photo of drawing
   - User confirms or retakes photo
5. If "Upload Image":
   - Device gallery opens
   - User selects image
6. Loading indicator shows analysis and report generation in progress
7. Complete analysis report screen appears showing:
   - The drawing image
   - Drawing type
   - AI-generated insights
   - Suggestions for the psychologist
   - Full report (automatically saved to client history)
8. User has option to:
   - Share report via email (opens email client with attachment)
   - Return to client detail screen
   - Start new analysis

## 5. History Viewing Flow
1. From Client Detail screen, user views list of past analyses (chronological)
2. Each analysis entry shows:
   - Thumbnail of drawing
   - Date of analysis
   - Brief summary/title
3. User taps on analysis entry to view full details
4. User views the complete analysis and report
5. User can:
   - Return to client detail screen
   - Share the report via email
   - Delete the report (with confirmation dialog)
6. If delete is confirmed, report is removed from client history

## 6. Logout Flow
1. User taps profile/menu icon from any screen
2. User selects "Logout" option
3. User is logged out and returned to login screen

This document outlines the minimal viable user flows required for the PsychDraw MVP, focusing on simplicity and core functionality.