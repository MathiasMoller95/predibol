# Supabase Email Templates

These HTML templates are used in Supabase Authentication email settings.

## How to update

1. Go to **Supabase Dashboard → Authentication → Email Templates**
2. Select the template to update
3. Copy the contents of the corresponding HTML file
4. Paste into the **Body** field
5. Set the **Subject** line as noted below
6. Save

## Templates

| File | Supabase Template | Subject |
|------|-------------------|---------|
| `confirm-signup.html` | Confirm Signup | ⚽ ¡Bienvenido a Predibol! Confirma tu cuenta |
| `reset-password.html` | Reset Password | 🔑 Restablece tu contraseña — Predibol |

## Variables

Supabase provides these variables for use in templates:

- `{{ .ConfirmationURL }}` — The verification or password-reset link
- `{{ .Email }}` — The user's email address
- `{{ .SiteURL }}` — The configured site URL

## Technical notes

- These are standalone HTML files, **not** React components. They use plain HTML with **inline CSS** only (no `<style>` blocks).
- They do **not** go through the Next.js build pipeline; they are stored in the repo for version control.
- Copy and paste the HTML into the Supabase dashboard manually.
