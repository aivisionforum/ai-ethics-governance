# TODO List - Responsible AI Infographic

## Pending Tasks

### Future Enhancements
- [ ] Create a modular package for Google services (Gemini API integration) that can be reused across different applications
  - Extract Google GenAI integration logic from `components/LiveChat.tsx`
  - Design reusable API client wrapper
  - Create separate package for audio processing utilities
  - Add TypeScript type definitions
  - Write documentation and usage examples
  - Publish as npm package or internal library

- [ ] Make Anna's conversational dialog resizable
  - Add resize functionality to LiveChat component
  - Add resize functionality to LiveDeepDiveChat component
  - Implement drag handles for resizing
  - Save user's preferred size to localStorage
  - Ensure responsive behavior on mobile devices

- [ ] Allow export of the conversation into MD or PDF
  - Add export button to conversation interface
  - Implement Markdown export functionality
  - Implement PDF export functionality (consider using jsPDF or similar library)
  - Include conversation metadata (date, principle, etc.)
  - Format exported content with proper styling

- [ ] Implement Edit Mode for Responsible AI Principles Cards
  - **Core Edit Functionality**
    - Add "Edit Mode" toggle button to enable/disable editing
    - Allow users to add new principle cards
    - Allow users to delete existing principle cards
    - Allow users to edit card content (title, description)

  - **Icon Management**
    - Allow users to upload custom icons for cards
    - Integrate with Google services to suggest icon options
    - Support emoji and image formats for icons

  - **Styling Customization**
    - Allow users to customize text content
    - Allow users to select color schemes for cards
    - Provide predefined color palette options
    - Support custom color picker

  - **Export Functionality**
    - Export entire infographic to Markdown format
    - Export entire infographic to PDF format
    - Implement screenshot functionality for the entire infographic display
    - Include all customizations (icons, colors, text) in exports

  - **Import Functionality**
    - Import infographic from Markdown format
    - Parse and validate imported MD structure
    - Allow offline editing and re-import workflow
    - Handle import errors gracefully

  - **Local Storage**
    - Save customizations to localStorage
    - Load saved customizations on page load
    - Implement "Reset to Default" functionality
    - Handle storage limits and cleanup

  - **Future Enhancements (Server-side)**
    - Implement user account system with authentication
    - Add server-side storage for persistent customizations
    - Implement version control for infographic changes
    - Add sharing functionality for custom infographics
    - Support collaboration features

## Completed Tasks
- [x] Set up local development server
- [x] Configure Google Gemini API key with environment variables
- [x] Add .env file to .gitignore for security
- [x] Update LiveChat component to use Vite environment variables

---

_Last updated: 2025-11-09_
