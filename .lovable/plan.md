# Adjustable landing banner colors

## What will change
- Add color controls to **Super User → Site branding** for the banner's main text, highlighted text, supporting text, primary button, and secondary button.
- Show the selected colors immediately in the existing banner preview before saving.
- Save the choices with the existing background image, darkening overlay, and image-position settings.
- Apply the saved colors to both the signed-in and signed-out landing banners, while keeping current colors as defaults.
- Include a **Restore defaults** action so the original Huntington palette is always easy to recover.

## Readability safeguards
- Display a contrast warning when a selected text or button color may be difficult to read over the banner.
- Keep button labels automatically dark or light based on the selected button background.

## Technical details
- Extend the existing site-branding record and validation with five color fields.
- Keep public read access and existing admin-only write controls unchanged.
- Use CSS custom properties scoped to the banner so these choices do not alter colors elsewhere on the site.
- Verify the branding screen and landing banner at desktop and phone sizes.
