# **App Name**: Bloomerang Call Campaign

## Core Features:

- CSV Import: Import donor reports in CSV format from Bloomerang.
- Call List Generation: Generate a call list from the imported data, displaying it in a spreadsheet-like format.
- Interaction Logging: Allow users to log call outcomes and notes directly within the app.
- Bloomerang Integration: Post interaction details (call outcomes, notes, etc.) to Bloomerang via API.
- Interaction Completion Suggestion: Use AI to provide suggested copy when logging an interaction, speeding up the interaction completion process.
- Queue and Retry: Manage calls to external service by queuing and retrying if the Bloomerang API times out to avoid errors.
- Audit Trail: Keep an audit log of who logged what and when to prevent accidental resubmissions or erroneous logging.

## Style Guidelines:

- Primary color: Deep blue (#293B5F) for a professional and trustworthy feel.
- Background color: Light gray (#F0F4F8) for a clean, modern interface.
- Accent color: Soft orange (#D77A61) for interactive elements and highlights.
- Body font: 'Inter', a grotesque-style sans-serif, provides a modern, machined, objective, neutral look and is suitable for both headlines and body text.
- Use clear, recognizable icons for actions like 'Call', 'Log Note', and 'Complete' based on the Clarity icon set.
- Spreadsheet-like layout with sticky headers, resizable columns, and a right-side drawer for interaction details.
- Subtle transitions when opening modals or updating interaction statuses.